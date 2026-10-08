"""Durable pronunciation candidates and evidence-gated audio publication."""
from __future__ import annotations

import copy
import hashlib
import json
import logging
import os
from pathlib import Path
import shutil
import subprocess
from typing import Callable, Literal
from uuid import UUID, uuid4

import boto3
from botocore.config import Config
from fastapi import APIRouter, File, Form, Header, HTTPException, UploadFile
from fastapi.responses import RedirectResponse, Response
from psycopg.rows import dict_row
from psycopg.types.json import Jsonb
from pydantic import BaseModel, Field
from starlette.concurrency import run_in_threadpool

from .database_connections import get_db_connection

logger = logging.getLogger(__name__)
MAX_AUDIO_BYTES = 5 * 1024 * 1024
PUBLICATION_LOCK = 724623183401
MANIFEST_PATH = Path(__file__).parents[1] / "audio_generation" / "manifest.json"
MODELS = [
    {"id": "eleven_v4", "label": "ElevenLabs v4", "provider": "elevenlabs"},
    {"id": "eleven_multilingual_v2", "label": "ElevenLabs Multilingual v2", "provider": "elevenlabs"},
    {"id": "tts-1", "label": "OpenAI TTS", "provider": "openai"},
]
CANDIDATE_FIELDS = "id, word, provider, model, voice_id, input_mode, input_text, settings, created_at, status, reviewer_name, reviewed_by, reviewed_at, dialect, notes, consent_reference, native_review_confirmed, pronunciation_score, naturalness_score, publication_error"


class ReviewConflict(Exception):
    """A candidate is not in the state required by an operation."""


class GenerateRequest(BaseModel):
    provider: Literal["elevenlabs", "openai"] = "elevenlabs"
    model: Literal["eleven_v4", "eleven_multilingual_v2", "tts-1"] = "eleven_v4"
    input_mode: Literal["original", "ipa", "respelling"] = "original"
    pronunciation: str | None = Field(default=None, max_length=4096)


class ReviewRequest(BaseModel):
    status: Literal["approved", "rejected"]
    reviewer_name: str = Field(min_length=1, max_length=200)
    dialect: str = Field(min_length=1, max_length=200)
    notes: str = Field(default="", max_length=4000)
    consent_reference: str | None = Field(default=None, max_length=2000)
    native_review_confirmed: bool = False
    pronunciation_score: int | None = Field(default=None, ge=1, le=5)
    naturalness_score: int | None = Field(default=None, ge=1, le=5)


class PilotItemRequest(BaseModel):
    word: str = Field(min_length=1, max_length=4096)
    english: str = Field(min_length=1, max_length=4096)


def baseline_manifest() -> dict:
    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    for entry in manifest["words"].values():
        if entry.get("review_status") == "approved" and not (entry.get("reviewed_by") and entry.get("reviewed_at")):
            entry["review_status"] = "needs_native_review"
        entry.setdefault("review_status", "needs_native_review")
    return manifest


def validate_audio(audio: bytes) -> bytes:
    if not audio or len(audio) > MAX_AUDIO_BYTES:
        raise ValueError("Audio must be nonempty and at most 5 MB")
    return audio


def normalize_recording(audio: bytes) -> bytes:
    validate_audio(audio)
    # Pipe input/output: user-supplied filenames never become filesystem paths.
    result = subprocess.run(
        ["ffmpeg", "-nostdin", "-hide_banner", "-loglevel", "error", "-i", "pipe:0",
         "-t", "60", "-af", "loudnorm=I=-16:TP=-1.5:LRA=11", "-ar", "44100", "-ac", "1",
         "-b:a", "128k", "-f", "mp3", "pipe:1"],
        input=audio, capture_output=True, timeout=30, check=True,
    )
    return validate_audio(result.stdout)


def candidate_json(row: dict) -> dict:
    result = dict(row)
    result.pop("audio_bytes", None)
    result.pop("snapshot", None)
    result.pop("sha256", None)
    for key in ("id", "created_at", "reviewed_at"):
        if result.get(key) is not None:
            result[key] = str(result[key])
    return result


class AudioReviewStore:
    """PostgreSQL is authoritative; S3 contains immutable approved distribution copies."""

    def _item(self, cursor, word: str) -> dict:
        entry = baseline_manifest()["words"].get(word)
        if entry is not None:
            return copy.deepcopy(entry)
        cursor.execute("SELECT english FROM audio_pilot_items WHERE word = %s", (word,))
        item = cursor.fetchone()
        if not item:
            raise KeyError(word)
        return {"english": item["english"], "category": "pilot", "tier": "pilot", "review_status": "needs_native_review"}

    def item(self, word: str) -> dict:
        with get_db_connection() as conn, conn.cursor(row_factory=dict_row) as cursor:
            return self._item(cursor, word)

    def add_item(self, word: str, english: str, admin: str) -> dict:
        with get_db_connection() as conn, conn.cursor(row_factory=dict_row) as cursor:
            if word in baseline_manifest()["words"]:
                raise ReviewConflict("Word is already in the audio library")
            cursor.execute("INSERT INTO audio_pilot_items(word, english, created_by) VALUES (%s,%s,%s) ON CONFLICT(word) DO NOTHING RETURNING word", (word, english, admin))
            if not cursor.fetchone():
                raise ReviewConflict("Pilot word already exists")
        return {"word": word, "english": english}

    def save(self, word: str, audio: bytes, provenance: dict, snapshot: dict, admin: str, consent: str | None = None) -> dict:
        validate_audio(audio)
        candidate_id = uuid4()
        with get_db_connection() as conn, conn.cursor(row_factory=dict_row) as cursor:
            cursor.execute(
                f"INSERT INTO audio_candidates(id,word,provider,model,voice_id,input_mode,input_text,settings,snapshot,audio_bytes,sha256,created_by,consent_reference) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING {CANDIDATE_FIELDS}",
                (candidate_id, word, provenance["provider"], provenance["model"], provenance.get("voice_id"), provenance["input_mode"], provenance["input_text"], Jsonb(provenance.get("settings", {})), Jsonb(snapshot), audio, hashlib.sha256(audio).hexdigest(), admin, consent),
            )
            result = candidate_json(cursor.fetchone())
        return {**result, "published": False}

    def candidates(self, word: str) -> list[dict]:
        with get_db_connection() as conn, conn.cursor(row_factory=dict_row) as cursor:
            self._item(cursor, word)
            cursor.execute(f"SELECT {', '.join('c.' + x.strip() for x in CANDIDATE_FIELDS.split(','))}, (p.candidate_id IS NOT NULL) AS published FROM audio_candidates c LEFT JOIN audio_publications p ON p.candidate_id=c.id AND p.word=c.word WHERE c.word=%s ORDER BY c.created_at DESC,c.id DESC LIMIT 100", (word,))
            return [candidate_json(row) for row in cursor.fetchall()]

    def preview(self, word: str, candidate_id: UUID) -> bytes:
        with get_db_connection() as conn, conn.cursor(row_factory=dict_row) as cursor:
            cursor.execute("SELECT audio_bytes FROM audio_candidates WHERE id=%s AND word=%s", (candidate_id, word))
            result = cursor.fetchone()
            if not result:
                raise KeyError(word)
            return bytes(result["audio_bytes"])

    def review(self, word: str, candidate_id: UUID, body: ReviewRequest, admin: str) -> dict:
        with get_db_connection() as conn, conn.cursor(row_factory=dict_row) as cursor:
            cursor.execute(f"SELECT {CANDIDATE_FIELDS} FROM audio_candidates WHERE id=%s AND word=%s FOR UPDATE", (candidate_id, word))
            row = cursor.fetchone()
            if not row:
                raise KeyError(word)
            if body.status == "approved" and not body.native_review_confirmed:
                raise ReviewConflict("Approval requires confirmation of native Chamorro review")
            consent = (body.consent_reference or row.get("consent_reference") or "").strip() or None
            if row["provider"] == "human_recording" and body.status == "approved" and not consent:
                raise ReviewConflict("Human recordings require a consent reference")
            if row["status"] != "pending":
                # Historical approved samples remain immutable and available for rollback.
                if row["status"] == body.status and row["reviewed_by"] == admin and row["reviewer_name"] == body.reviewer_name.strip() and row["dialect"] == body.dialect.strip() and row["notes"] == body.notes and row.get("consent_reference") == consent and row["native_review_confirmed"] == body.native_review_confirmed and row["pronunciation_score"] == body.pronunciation_score and row["naturalness_score"] == body.naturalness_score:
                    return candidate_json({k: row[k] for k in CANDIDATE_FIELDS.split(", ")})
                raise ReviewConflict("Reviewed candidates are immutable; create a new candidate")
            cursor.execute(f"UPDATE audio_candidates SET status=%s,reviewer_name=%s,reviewed_by=%s,reviewed_at=now(),dialect=%s,notes=%s,consent_reference=%s,native_review_confirmed=%s,pronunciation_score=%s,naturalness_score=%s WHERE id=%s AND word=%s RETURNING {CANDIDATE_FIELDS}", (body.status, body.reviewer_name.strip(), admin, body.dialect.strip(), body.notes, consent, body.native_review_confirmed, body.pronunciation_score, body.naturalness_score, candidate_id, word))
            return candidate_json(cursor.fetchone())

    def _manifest(self, cursor) -> dict:
        manifest = baseline_manifest()
        cursor.execute("SELECT c.id,c.word,c.provider,c.model,c.voice_id,c.input_text,c.snapshot,c.created_at,c.reviewed_by,c.reviewer_name,c.reviewed_at,c.dialect,c.consent_reference,c.native_review_confirmed,c.pronunciation_score,c.naturalness_score,octet_length(c.audio_bytes) AS size_bytes,p.published_at FROM audio_publications p JOIN audio_candidates c ON c.id=p.candidate_id AND c.word=p.word WHERE c.status='approved'")
        bucket, region = os.getenv("AWS_S3_BUCKET", "hafagpt"), os.getenv("AWS_REGION", "ap-southeast-2")
        for row in cursor.fetchall():
            entry = copy.deepcopy(row["snapshot"])
            filename = f"candidate_{row['id']}.mp3"
            entry.update({"file": filename, "url": f"https://{bucket}.s3.{region}.amazonaws.com/audio/{filename}", "phonetic_used": row["input_text"], "size_bytes": row["size_bytes"], "generated_at": str(row["created_at"]), "tts_provider": row["provider"], "model": row["model"], "voice_id": row["voice_id"], "candidate_id": str(row["id"]), "review_status": "approved", "reviewed_by": row["reviewer_name"], "reviewer_name": row["reviewer_name"], "reviewed_at": str(row["reviewed_at"]), "dialect": row["dialect"], "native_review_confirmed": row["native_review_confirmed"], "pronunciation_score": row["pronunciation_score"], "naturalness_score": row["naturalness_score"], "audio_origin": "human_recording" if row["provider"] == "human_recording" else "synthetic_ai"})
            manifest["words"][row["word"]] = entry
        manifest["total_words"] = len(manifest["words"])
        return manifest

    def published_url(self, word: str) -> str:
        with get_db_connection() as conn, conn.cursor(row_factory=dict_row) as cursor:
            cursor.execute("SELECT c.id FROM audio_publications p JOIN audio_candidates c ON c.id=p.candidate_id AND c.word=p.word WHERE p.word=%s AND c.status='approved' AND c.native_review_confirmed", (word,))
            row = cursor.fetchone()
            if not row:
                raise KeyError(word)
        bucket, region = os.getenv("AWS_S3_BUCKET", "hafagpt"), os.getenv("AWS_REGION", "ap-southeast-2")
        return f"https://{bucket}.s3.{region}.amazonaws.com/audio/candidate_{row['id']}.mp3"

    def manifest(self) -> dict:
        with get_db_connection() as conn, conn.cursor(row_factory=dict_row) as cursor:
            return self._manifest(cursor)

    def words(self) -> list[dict]:
        with get_db_connection() as conn, conn.cursor(row_factory=dict_row) as cursor:
            manifest = self._manifest(cursor)
            cursor.execute("SELECT word,english FROM audio_pilot_items ORDER BY word")
            for item in cursor.fetchall():
                manifest["words"].setdefault(item["word"], {"english": item["english"], "tier": "pilot", "category": "pilot", "review_status": "needs_native_review"})
        return [{"chamorro": word, "english": data.get("english", ""), "tier": str(data.get("tier", "unknown")), "category": data.get("category", ""), "status": data.get("review_status", "needs_native_review"), "url": data.get("url", ""), "phonetic_used": data.get("phonetic_used", word), "generated_at": data.get("generated_at", ""), "needs_regeneration": data.get("needs_regeneration", False), "published_candidate_id": data.get("candidate_id")} for word, data in sorted(manifest["words"].items())]

    def publish(self, word: str, candidate_id: UUID, admin: str) -> dict:
        try:
            with get_db_connection() as conn, conn.cursor(row_factory=dict_row) as cursor:
                # Serializes whole-manifest publication across every worker and word.
                cursor.execute("SET LOCAL lock_timeout = '15s'")
                cursor.execute("SELECT pg_advisory_xact_lock(%s)", (PUBLICATION_LOCK,))
                cursor.execute("SELECT * FROM audio_candidates WHERE id=%s AND word=%s FOR UPDATE", (candidate_id, word))
                row = cursor.fetchone()
                if not row:
                    raise KeyError(word)
                if row["status"] != "approved" or not row["native_review_confirmed"] or not all(row.get(k) for k in ("reviewed_by", "reviewed_at", "reviewer_name", "dialect")):
                    raise ReviewConflict("Only candidates with recorded approval evidence can be published")
                audio = validate_audio(bytes(row["audio_bytes"]))
                if hashlib.sha256(audio).hexdigest() != row["sha256"]:
                    raise ReviewConflict("Candidate audio integrity check failed")
                s3 = boto3.client("s3", region_name=os.getenv("AWS_REGION", "ap-southeast-2"), config=Config(connect_timeout=5, read_timeout=15, retries={"max_attempts": 2}))
                bucket = os.getenv("AWS_S3_BUCKET", "hafagpt")
                filename = f"candidate_{candidate_id}.mp3"
                s3.put_object(Bucket=bucket, Key=f"audio/{filename}", Body=audio, ContentType="audio/mpeg", CacheControl="public,max-age=31536000,immutable")
                cursor.execute("INSERT INTO audio_publications(word,candidate_id,published_by) VALUES (%s,%s,%s) ON CONFLICT(word) DO UPDATE SET candidate_id=EXCLUDED.candidate_id,published_by=EXCLUDED.published_by,published_at=now()", (word, candidate_id, admin))
                manifest = self._manifest(cursor)
                s3.put_object(Bucket=bucket, Key="audio/manifest.json", Body=json.dumps(manifest, ensure_ascii=False).encode("utf-8"), ContentType="application/json", CacheControl="no-cache")
                cursor.execute("UPDATE audio_candidates SET publication_error=NULL WHERE id=%s", (candidate_id,))
            return {"success": True, "word": word, "candidate_id": str(candidate_id), "file": filename}
        except (KeyError, ReviewConflict):
            raise
        except Exception:
            # Separate transaction records recovery state without credentials/upstream text.
            try:
                with get_db_connection() as conn, conn.cursor() as cursor:
                    cursor.execute("UPDATE audio_candidates SET publication_error='publication_failed' WHERE id=%s AND word=%s", (candidate_id, word))
            except Exception:
                logger.warning("Could not persist audio publication recovery marker")
            raise


def create_audio_review_router(verify_admin: Callable, *, store_factory: Callable = AudioReviewStore) -> APIRouter:
    router = APIRouter(tags=["Audio"])

    async def operation(method: str, *args):
        try:
            return await run_in_threadpool(getattr(store_factory(), method), *args)
        except KeyError:
            raise HTTPException(404, "Audio word or candidate not found") from None
        except ReviewConflict as error:
            raise HTTPException(409, str(error)) from None
        except HTTPException:
            raise
        except Exception:
            logger.warning("Audio review storage operation failed: %s", method)
            raise HTTPException(503, "Audio review storage is unavailable; retry later") from None

    @router.get("/api/audio/manifest")
    async def public_manifest():
        return await operation("manifest")

    @router.get("/api/audio/published/{word}")
    async def published_audio(word: str):
        url = await operation("published_url", word)
        return RedirectResponse(url, status_code=302, headers={"Cache-Control": "no-store"})

    @router.get("/api/admin/audio")
    async def list_words(status_filter: str | None = None, tier_filter: str | None = None, search: str | None = None, authorization: str | None = Header(None)):
        await verify_admin(authorization)
        words = await operation("words")
        stats = {"total": len(words), "approved": 0, "needs_review": 0, "needs_fix": 0, "by_tier": {"1": 0, "2": 0, "flashcards": 0, "pilot": 0}}
        for word in words:
            status = word["status"]
            stats["needs_review" if status == "needs_native_review" else status] = stats.get("needs_review" if status == "needs_native_review" else status, 0) + 1
            tier = word["tier"]
            stats["by_tier"][tier] = stats["by_tier"].get(tier, 0) + 1
        def normalized(text):
            return text.lower().replace("å", "a").replace("ñ", "n").replace("'", "").replace("-", " ")
        filtered = [word for word in words if (not status_filter or word["status"] == status_filter or (status_filter == "needs_review" and word["status"] == "needs_native_review")) and (not tier_filter or word["tier"] == tier_filter) and (not search or normalized(search) in normalized(word["chamorro"]) or normalized(search) in normalized(word["english"]))]
        return {"words": filtered, "total": len(filtered), "stats": stats, "config": {"default_model": "eleven_v4", "voice_id": os.getenv("ELEVENLABS_VOICE_ID", "EXAVITQu4vr4xnSDxMaL"), "models": MODELS, "can_record": bool(shutil.which("ffmpeg")), "elevenlabs_configured": bool(os.getenv("ELEVENLABS_API_KEY")), "openai_configured": bool(os.getenv("OPENAI_API_KEY"))}}

    @router.post("/api/admin/audio/pilot-items")
    async def add_pilot(body: PilotItemRequest, authorization: str | None = Header(None)):
        admin = await verify_admin(authorization)
        if not body.word.strip() or not body.english.strip():
            raise HTTPException(422, "Word and English description are required")
        return await operation("add_item", body.word.strip(), body.english.strip(), admin)

    @router.get("/api/admin/audio/{word}/candidates")
    async def list_candidates(word: str, authorization: str | None = Header(None)):
        await verify_admin(authorization)
        return {"candidates": await operation("candidates", word)}

    @router.get("/api/admin/audio/{word}/candidates/{candidate_id}/audio")
    async def preview(word: str, candidate_id: UUID, authorization: str | None = Header(None)):
        await verify_admin(authorization)
        audio = await operation("preview", word, candidate_id)
        return Response(audio, media_type="audio/mpeg", headers={"Cache-Control": "no-store", "X-Content-Type-Options": "nosniff"})

    @router.post("/api/admin/audio/{word}/regenerate")
    async def generate(word: str, body: GenerateRequest, authorization: str | None = Header(None)):
        admin = await verify_admin(authorization)
        if not any(model["id"] == body.model and model["provider"] == body.provider for model in MODELS):
            raise HTTPException(422, "Model does not match provider")
        if body.input_mode != "original" and not (body.pronunciation or "").strip():
            raise HTTPException(422, "Pronunciation is required for this input mode")
        snapshot = await operation("item", word)
        try:
            from .audio_synthesis import generate_speech
            audio, provenance = await run_in_threadpool(generate_speech, word, provider=body.provider, model=body.model, input_mode=body.input_mode, pronunciation=body.pronunciation)
            validate_audio(audio)
        except Exception:
            logger.warning("Audio candidate generation failed")
            raise HTTPException(502, "Speech generation failed; existing audio is unchanged") from None
        candidate = await operation("save", word, audio, provenance, snapshot, admin)
        return {"success": True, "word": word, "candidate": candidate}

    @router.post("/api/admin/audio/{word}/upload-recording")
    async def record(word: str, audio_file: UploadFile = File(...), consent_reference: str = Form(..., max_length=2000), authorization: str | None = Header(None)):
        admin = await verify_admin(authorization)
        if not consent_reference.strip():
            raise HTTPException(422, "A recording consent reference is required")
        snapshot = await operation("item", word)
        try:
            audio = await audio_file.read(MAX_AUDIO_BYTES + 1)
            validate_audio(audio)
            audio = await run_in_threadpool(normalize_recording, audio)
        except ValueError:
            raise HTTPException(413, "Recording must be nonempty and at most 5 MB") from None
        except Exception:
            raise HTTPException(422, "Recording could not be normalized; existing audio is unchanged") from None
        finally:
            await audio_file.close()
        provenance = {"provider": "human_recording", "model": "human", "voice_id": None, "input_mode": "original", "input_text": word, "settings": {"normalization": "loudnorm", "max_duration_seconds": 60}}
        return {"success": True, "word": word, "candidate": await operation("save", word, audio, provenance, snapshot, admin, consent_reference.strip())}

    @router.patch("/api/admin/audio/{word}/candidates/{candidate_id}/review")
    async def review(word: str, candidate_id: UUID, body: ReviewRequest, authorization: str | None = Header(None)):
        admin = await verify_admin(authorization)
        if not body.reviewer_name.strip() or not body.dialect.strip():
            raise HTTPException(422, "Reviewer name and dialect are required")
        return {"candidate": await operation("review", word, candidate_id, body, admin)}

    @router.post("/api/admin/audio/{word}/candidates/{candidate_id}/publish")
    async def publish(word: str, candidate_id: UUID, authorization: str | None = Header(None)):
        admin = await verify_admin(authorization)
        return await operation("publish", word, candidate_id, admin)

    @router.patch("/api/admin/audio/{word}/status")
    async def legacy_status(word: str, authorization: str | None = Header(None)):
        await verify_admin(authorization)
        raise HTTPException(409, "Review a specific candidate with reviewer evidence instead")

    return router
