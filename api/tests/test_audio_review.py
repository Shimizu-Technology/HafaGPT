"""Candidate privacy, approval evidence and failure-safe publication contracts."""
from copy import deepcopy
from datetime import datetime, timezone
import hashlib
import sys
from types import SimpleNamespace
from uuid import uuid4

from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient
import pytest

from api import audio_review as review

WORD = "Håfa Adai"
CANDIDATE = uuid4()
AUDIO = b"complete-mp3"


class Store:
    def __init__(self):
        self.calls = []
        self.rows = {}

    def item(self, word):
        self.calls.append(("item", word))
        if word != WORD:
            raise KeyError(word)
        return {"english": "Hello", "file": "old.mp3"}

    def preflight(self, word):
        pass

    def sync_status(self):
        return {"pending": False}

    def sync_manifest(self):
        return {"success": True, "manifest_synced": True}

    def words(self):
        self.calls.append(("words",))
        return [{"chamorro": WORD, "english": "Hello", "tier": "1", "category": "greetings", "status": "needs_native_review", "url": "old.mp3"}]

    def save(self, word, audio, provenance, snapshot, admin, consent=None):
        self.calls.append(("save", word, audio, provenance, snapshot, admin, consent))
        candidate = {"id": str(CANDIDATE), "word": word, "status": "pending", **provenance}
        self.rows[(word, CANDIDATE)] = (candidate, audio)
        return candidate

    def candidates(self, word):
        self.item(word)
        return [row[0] for (row_word, _), row in self.rows.items() if word == row_word]

    def preview(self, word, candidate_id):
        self.calls.append(("preview", word, candidate_id))
        if (word, candidate_id) not in self.rows:
            raise KeyError(word)
        return self.rows[(word, candidate_id)][1]

    def review(self, word, candidate_id, body, admin):
        self.calls.append(("review", word, candidate_id, body, admin))
        return {"id": str(candidate_id), "status": body.status, "reviewed_by": admin}

    def publish(self, word, candidate_id, admin):
        self.calls.append(("publish", word, candidate_id, admin))
        raise review.ReviewConflict("Only approved candidates may be published")

    def manifest(self):
        return {"words": {WORD: {"file": "old.mp3"}}}


def client(store, role="admin"):
    async def verify(authorization):
        if not authorization:
            raise HTTPException(401, "Authentication required")
        if role != "admin":
            raise HTTPException(403, "Admin access required")
        return "trusted-clerk-admin"
    app = FastAPI()
    app.include_router(review.create_audio_review_router(verify, store_factory=lambda: store))
    return TestClient(app)


def auth():
    return {"Authorization": "Bearer authenticated-session"}


@pytest.mark.parametrize("method,path,body", [
    ("get", "/api/admin/audio", None),
    ("post", "/api/admin/audio/sync-manifest", None),
    ("get", f"/api/admin/audio/{WORD}/candidates", None),
    ("get", f"/api/admin/audio/{WORD}/candidates/{CANDIDATE}/audio", None),
    ("post", f"/api/admin/audio/{WORD}/regenerate", {}),
    ("patch", f"/api/admin/audio/{WORD}/status", {"status": "approved"}),
    ("patch", f"/api/admin/audio/{WORD}/candidates/{CANDIDATE}/review", {"status": "approved", "reviewer_name": "Reviewer", "dialect": "Guam"}),
    ("post", f"/api/admin/audio/{WORD}/candidates/{CANDIDATE}/publish", None),
    ("post", "/api/admin/audio/pilot-items", {"word": "Provided item", "english": "Provided meaning"}),
])
@pytest.mark.parametrize("role,headers,expected", [("admin", {}, 401), ("learner", auth(), 403)])
def test_admin_routes_fail_before_storage_access(method, path, body, role, headers, expected):
    store = Store()
    response = client(store, role).request(method, path, json=body, headers=headers)
    assert response.status_code == expected
    assert store.calls == []


def synthesis_stub(monkeypatch, function):
    import api
    stub = SimpleNamespace(generate_speech=function, SpeechGenerationError=type("SafeSpeechError", (RuntimeError,), {}))
    monkeypatch.setitem(sys.modules, "api.audio_synthesis", stub)
    monkeypatch.setattr(api, "audio_synthesis", stub, raising=False)


def test_generation_saves_private_candidate_with_original_snapshot_and_trusted_creator(monkeypatch):
    store = Store()
    calls = []
    def generate(text, **kwargs):
        calls.append((text, kwargs))
        return AUDIO, {"provider": "elevenlabs", "model": "eleven_v4", "voice_id": "voice", "input_mode": "original", "input_text": text, "settings": {"stability": .75}}
    synthesis_stub(monkeypatch, generate)
    response = client(store).post(f"/api/admin/audio/{WORD}/regenerate", json={}, headers=auth())
    assert response.status_code == 200
    assert response.json()["candidate"]["status"] == "pending"
    assert calls == [(WORD, {"provider": "elevenlabs", "model": "eleven_v4", "input_mode": "original", "pronunciation": None})]
    saved = store.calls[-1]
    assert saved[4] == {"english": "Hello", "file": "old.mp3"}
    assert saved[5] == "trusted-clerk-admin"
    assert all(call[0] != "publish" for call in store.calls)


@pytest.mark.parametrize("body", [
    {"model": "tts-1", "provider": "elevenlabs"},
    {"input_mode": "ipa"},
    {"input_mode": "respelling", "pronunciation": " "},
    {"provider": "untrusted-provider"},
])
def test_invalid_generation_parameters_never_call_provider(monkeypatch, body):
    synthesis_stub(monkeypatch, lambda *args, **kwargs: pytest.fail("provider called"))
    store = Store()
    assert client(store).post(f"/api/admin/audio/{WORD}/regenerate", json=body, headers=auth()).status_code == 422
    assert store.calls == []


@pytest.mark.parametrize("outcome", ["exception", "empty", "oversized"])
def test_failed_provider_never_saves_or_publishes_and_hides_private_error(monkeypatch, outcome):
    def generate(*args, **kwargs):
        if outcome == "exception":
            raise RuntimeError("private provider credential")
        return (b"" if outcome == "empty" else b"x" * (review.MAX_AUDIO_BYTES + 1)), {}
    synthesis_stub(monkeypatch, generate)
    store = Store()
    response = client(store).post(f"/api/admin/audio/{WORD}/regenerate", json={}, headers=auth())
    assert response.status_code == 502
    assert "private" not in response.text
    assert [call[0] for call in store.calls] == ["item"]


def test_word_validation_precedes_billable_generation(monkeypatch):
    synthesis_stub(monkeypatch, lambda *args, **kwargs: pytest.fail("provider called"))
    assert client(Store()).post("/api/admin/audio/unknown/regenerate", json={}, headers=auth()).status_code == 404


def test_private_preview_requires_correct_candidate_word_and_never_caches():
    store = Store()
    store.rows[(WORD, CANDIDATE)] = ({}, AUDIO)
    browser = client(store)
    response = browser.get(f"/api/admin/audio/{WORD}/candidates/{CANDIDATE}/audio", headers=auth())
    assert response.content == AUDIO
    assert response.headers["cache-control"] == "no-store"
    assert browser.get(f"/api/admin/audio/another/candidates/{CANDIDATE}/audio", headers=auth()).status_code == 404
    assert browser.get(f"/api/admin/audio/{WORD}/candidates/{CANDIDATE}/audio").status_code == 401


def test_review_binds_word_candidate_and_trusted_admin():
    store = Store()
    response = client(store).patch(f"/api/admin/audio/{WORD}/candidates/{CANDIDATE}/review", json={"status": "approved", "reviewer_name": "Speaker", "dialect": "Guam", "native_review_confirmed": True, "reviewed_by": "forged-admin"}, headers=auth())
    assert response.status_code == 200
    assert response.json()["candidate"]["reviewed_by"] == "trusted-clerk-admin"
    assert store.calls[-1][1:3] == (WORD, CANDIDATE)


@pytest.mark.parametrize("fields", [{"reviewer_name": " "}, {"dialect": " "}, {"pronunciation_score": 6}, {"naturalness_score": 0}])
def test_review_rejects_missing_evidence_and_out_of_range_scores(fields):
    store = Store()
    body = {"status": "approved", "reviewer_name": "Speaker", "dialect": "Guam", **fields}
    assert client(store).patch(f"/api/admin/audio/{WORD}/candidates/{CANDIDATE}/review", json=body, headers=auth()).status_code == 422
    assert store.calls == []


def test_legacy_status_cannot_approve_audio_without_candidate_evidence():
    store = Store()
    assert client(store).patch(f"/api/admin/audio/{WORD}/status", json={"status": "approved"}, headers=auth()).status_code == 409
    assert store.calls == []


def test_recording_requires_consent_and_normalization(monkeypatch):
    monkeypatch.setattr(review, "normalize_recording", lambda data: AUDIO)
    store = Store()
    browser = client(store)
    response = browser.post(f"/api/admin/audio/{WORD}/upload-recording", files={"audio_file": ("../../unsafe.webm", b"recording", "audio/webm")}, data={"consent_reference": "Speaker consent record"}, headers=auth())
    assert response.status_code == 200
    saved = store.calls[-1]
    assert saved[2] == AUDIO and saved[3]["provider"] == "human_recording"
    assert saved[-1] == "Speaker consent record"
    store.calls.clear()
    response = browser.post(f"/api/admin/audio/{WORD}/upload-recording", files={"audio_file": ("test.webm", b"recording")}, data={"consent_reference": " "}, headers=auth())
    assert response.status_code == 422 and store.calls == []


def test_normalization_failure_never_falls_back_to_unverified_raw_recording(monkeypatch):
    monkeypatch.setattr(review, "normalize_recording", lambda data: (_ for _ in ()).throw(RuntimeError("private FFmpeg path")))
    store = Store()
    response = client(store).post(f"/api/admin/audio/{WORD}/upload-recording", files={"audio_file": ("test.webm", b"recording")}, data={"consent_reference": "consent"}, headers=auth())
    assert response.status_code == 422 and "private" not in response.text
    assert [call[0] for call in store.calls] == ["item"]


def test_public_manifest_does_not_require_admin_and_storage_error_is_safe():
    assert client(Store()).get("/api/audio/manifest").json()["words"][WORD]["file"] == "old.mp3"
    store = Store()
    store.manifest = lambda: (_ for _ in ()).throw(RuntimeError("private database credentials"))
    failed = client(store).get("/api/audio/manifest")
    assert failed.status_code == 503 and "private" not in failed.text


def test_legacy_approval_without_named_reviewer_is_normalized(monkeypatch, tmp_path):
    manifest = tmp_path / "manifest.json"
    manifest.write_text('{"words":{"a":{"review_status":"approved"},"b":{"review_status":"approved","reviewed_by":"speaker","reviewed_at":"date"}}}')
    monkeypatch.setattr(review, "MANIFEST_PATH", manifest)
    result = review.baseline_manifest()
    assert result["words"]["a"]["review_status"] == "needs_native_review"
    assert result["words"]["b"]["review_status"] == "approved"


def approved_row(**overrides):
    return {"id": CANDIDATE, "word": WORD, "provider": "elevenlabs", "model": "eleven_v4", "voice_id": "voice", "input_mode": "original", "input_text": WORD, "settings": {}, "created_at": datetime.now(timezone.utc), "status": "approved", "reviewer_name": "Native speaker", "reviewed_by": "trusted-admin", "reviewed_at": datetime.now(timezone.utc), "dialect": "Guam", "notes": "Reviewed", "consent_reference": None, "native_review_confirmed": True, "pronunciation_score": 5, "naturalness_score": 4, "audio_bytes": AUDIO, "sha256": hashlib.sha256(AUDIO).hexdigest(), "snapshot": {"english": "Hello", "tier": 1, "category": "greetings"}, **overrides}


class CursorContext:
    def __init__(self, conn): self.conn = conn
    def __enter__(self): return self.conn
    def __exit__(self, *_): pass


class Connection:
    def __init__(self, row, state, fail_pointer=False, fail_sync=False):
        self.row, self.state, self.staged = row, state, deepcopy(state)
        self.fail_pointer, self.fail_sync = fail_pointer, fail_sync
        self.statements, self.rolled_back = [], False
    def __enter__(self): return self
    def __exit__(self, exception_type, *_):
        if exception_type:
            self.rolled_back = True
        elif (self.fail_pointer and any(sql.startswith("INSERT INTO audio_publications") for sql, _ in self.statements)) or (self.fail_sync and any("SET pending=false" in sql for sql, _ in self.statements)):
            self.rolled_back = True
            raise RuntimeError("private commit failure")
        else: self.state.update(self.staged)
    def cursor(self, **kwargs): return CursorContext(self)
    def execute(self, sql, params=None):
        self.statements.append((sql, params))
        if sql.startswith("INSERT INTO audio_publications"): self.staged["pointer"] = params[1]
        if "SET revision=revision+1" in sql:
            self.staged["revision"] += 1
            self.staged["pending"] = True
        if "SET pending=false" in sql: self.staged["pending"] = False
        if "SET pending=true,last_error" in sql:
            self.staged.update(pending=True,last_error="manifest_sync_failed")
    def fetchone(self):
        if "SELECT revision FROM audio_manifest_sync" in self.statements[-1][0]: return {"revision": self.staged["revision"]}
        return self.row
    def fetchall(self):
        assert self.staged["pointer"] == self.state["pointer"], "Export cannot precede commit"
        return [{**self.row, "id": self.state["pointer"], "size_bytes": len(AUDIO)}]


def publication_setup(monkeypatch, row, fail_manifest=False, fail_pointer=False, fail_sync=False):
    state = {"pointer": "previous-approved", "pending": False, "revision": 0, "last_error": None}
    connections, writes = [], []
    def connect():
        conn = Connection(row, state, fail_pointer, fail_sync)
        connections.append(conn)
        return conn
    monkeypatch.setattr(review, "get_db_connection", connect)
    monkeypatch.setattr(review, "baseline_manifest", lambda: {"words": {WORD: {"file": "previous.mp3"}}, "total_words": 1})
    def put_object(**kwargs):
        writes.append(kwargs)
        if kwargs["Key"] == "audio/manifest.json":
            import json
            assert json.loads(kwargs["Body"])["words"][WORD]["candidate_id"] == str(state["pointer"])
            if fail_manifest: raise RuntimeError("private AWS error")
    monkeypatch.setattr(review.boto3, "client", lambda *args, **kwargs: SimpleNamespace(put_object=put_object))
    return state, connections, writes


@pytest.mark.parametrize("row", [approved_row(status="pending"), approved_row(reviewed_by=None), approved_row(native_review_confirmed=False)])
def test_store_publication_gate_precedes_all_s3_writes(monkeypatch, row):
    state, connections, writes = publication_setup(monkeypatch, row)
    with pytest.raises(review.ReviewConflict): review.AudioReviewStore().publish(WORD, CANDIDATE, "admin")
    assert writes == [] and state["pointer"] == "previous-approved"
    assert connections[0].rolled_back


def test_failed_remote_manifest_keeps_committed_pointer_and_retry_outbox(monkeypatch):
    state, connections, writes = publication_setup(monkeypatch, approved_row(), fail_manifest=True)
    result = review.AudioReviewStore().publish(WORD, CANDIDATE, "admin")
    assert result["success"] and not result["manifest_synced"]
    assert state["pointer"] == CANDIDATE and state["pending"]
    assert state["last_error"] == "manifest_sync_failed"
    assert writes[0]["Key"] == f"audio/candidate_{CANDIDATE}.mp3"
    assert any("publication_error=%s" in sql and params[0] == "manifest_sync_failed" for conn in connections for sql, params in conn.statements)


def test_pointer_commit_failure_never_exports_uncommitted_manifest(monkeypatch):
    state, connections, writes = publication_setup(monkeypatch, approved_row(), fail_pointer=True)
    with pytest.raises(RuntimeError): review.AudioReviewStore().publish(WORD, CANDIDATE, "admin")
    assert state["pointer"] == "previous-approved" and not state["pending"]
    assert [write["Key"] for write in writes] == [f"audio/candidate_{CANDIDATE}.mp3"]


def test_sync_commit_failure_exports_committed_pointer_and_retains_outbox(monkeypatch):
    state, connections, writes = publication_setup(monkeypatch, approved_row(), fail_sync=True)
    result = review.AudioReviewStore().publish(WORD, CANDIDATE, "admin")
    assert not result["manifest_synced"] and state["pointer"] == CANDIDATE and state["pending"]
    assert writes[-1]["Key"] == "audio/manifest.json"
    assert any(conn.rolled_back for conn in connections)


def test_publication_serializes_manifest_and_retries_historical_candidates(monkeypatch):
    state, connections, writes = publication_setup(monkeypatch, approved_row())
    store = review.AudioReviewStore()
    first, second = store.publish(WORD, CANDIDATE, "admin"), store.publish(WORD, CANDIDATE, "admin")
    assert first == second and state["pointer"] == CANDIDATE
    assert not state["pending"] and state["revision"] == 2
    assert {write["Key"] for write in writes} == {f"audio/candidate_{CANDIDATE}.mp3", "audio/manifest.json"}
    for conn in connections:
        if any("audio_publications" in sql or "SET pending=false" in sql for sql, _ in conn.statements):
            assert any("pg_advisory_xact_lock" in sql and params == (review.PUBLICATION_LOCK,) for sql, params in conn.statements)
    assert all(write["Key"] != "audio/previous.mp3" for write in writes)


@pytest.mark.parametrize("row,body", [
    (approved_row(status="pending"), {"native_review_confirmed": False}),
    (approved_row(status="pending", provider="human_recording"), {"native_review_confirmed": True}),
    (approved_row(), {"native_review_confirmed": True, "reviewer_name": "Another reviewer"}),
])
def test_store_review_requires_native_evidence_consent_and_immutable_approval(monkeypatch, row, body):
    state = {"pointer": None}
    connection = Connection(row, state)
    monkeypatch.setattr(review, "get_db_connection", lambda: connection)
    request = review.ReviewRequest(status="approved", reviewer_name=body.pop("reviewer_name", "Native speaker"), dialect="Guam", **body)
    with pytest.raises(review.ReviewConflict):
        review.AudioReviewStore().review(WORD, CANDIDATE, request, "trusted-admin")
    assert not any(sql.startswith("UPDATE audio_candidates") for sql, _ in connection.statements)


def test_candidate_json_never_contains_audio_or_storage_snapshot():
    result = review.candidate_json(approved_row())
    assert "audio_bytes" not in result and "snapshot" not in result
    assert result["id"] == str(CANDIDATE)


def test_public_playback_redirects_current_approved_pointer_without_caching():
    store = Store()
    def published_url(word):
        if word != WORD:
            raise KeyError(word)
        return f"https://audio.example/candidate_{CANDIDATE}.mp3"
    store.published_url = published_url
    browser = client(store)
    response = browser.get(f"/api/audio/published/{WORD}", follow_redirects=False)
    assert response.status_code == 302
    assert response.headers["location"] == f"https://audio.example/candidate_{CANDIDATE}.mp3"
    assert response.headers["cache-control"] == "no-store"
    assert browser.get("/api/audio/published/unknown", follow_redirects=False).status_code == 404


def test_rejection_requires_notes_before_storage():
    store = Store()
    response = client(store).patch(f"/api/admin/audio/{WORD}/candidates/{CANDIDATE}/review", json={"status":"rejected","reviewer_name":"Reviewer","dialect":"Guam"}, headers=auth())
    assert response.status_code == 422 and not store.calls


def test_slash_word_binding_for_private_preview():
    store = Store()
    word = "Provided / item"
    store.rows[(word,CANDIDATE)] = ({},AUDIO)
    response = client(store).get(f"/api/admin/audio/{word}/candidates/{CANDIDATE}/audio", headers=auth())
    assert response.status_code == 200 and response.content == AUDIO
    assert store.calls[-1][1] == word


def test_public_manifest_revalidates_and_sync_retry_requires_auth():
    browser = client(Store())
    assert browser.get("/api/audio/manifest").headers["cache-control"] == "no-cache"
    assert browser.post("/api/admin/audio/sync-manifest", headers=auth()).json()["manifest_synced"]
    assert not browser.get("/api/admin/audio",headers=auth()).json()["config"]["manifest_sync_pending"]


def test_candidate_cap_uses_word_lock_before_blob_insert(monkeypatch):
    conn = Connection({"candidate_count":50},{"pointer":None})
    monkeypatch.setattr(review,"get_db_connection",lambda:conn)
    with pytest.raises(review.ReviewConflict,match="50-candidate"):
        review.AudioReviewStore().save(WORD,AUDIO,{}, {}, "admin")
    assert "pg_advisory_xact_lock(hashtextextended" in conn.statements[0][0]
    assert not any(sql.startswith("INSERT") for sql,_ in conn.statements)


def test_safe_provider_access_error_remains_actionable(monkeypatch):
    class SpeechGenerationError(RuntimeError): pass
    def generate(*args,**kwargs): raise SpeechGenerationError("ElevenLabs is not configured. Ask the site administrator to check its API key.")
    monkeypatch.setitem(sys.modules,"api.audio_synthesis",SimpleNamespace(generate_speech=generate,SpeechGenerationError=SpeechGenerationError))
    response = client(Store()).post(f"/api/admin/audio/{WORD}/regenerate",json={},headers=auth())
    assert response.status_code == 502 and "not configured" in response.json()["detail"]
