from fastapi import FastAPI
from fastapi.testclient import TestClient

from api.vocabulary_records import create_vocabulary_records_router


def make_client(service) -> TestClient:
    app = FastAPI()
    app.include_router(
        create_vocabulary_records_router(service_factory=lambda: service)
    )
    return TestClient(app)


def test_stable_word_route_returns_only_the_exact_id_record():
    class Service:
        @staticmethod
        def get_word_by_id(word_id):
            assert word_id == "revised-word-v1-exact"
            return {"word_id": word_id, "chamorro": "hånum"}

    response = make_client(Service()).get(
        "/api/vocabulary/words/revised-word-v1-exact"
    )

    assert response.status_code == 200
    assert response.json() == {
        "word_id": "revised-word-v1-exact",
        "chamorro": "hånum",
    }


def test_stable_word_route_uses_safe_not_found_and_failure_responses():
    class MissingService:
        @staticmethod
        def get_word_by_id(_word_id):
            return None

    missing = make_client(MissingService()).get("/api/vocabulary/words/missing")
    assert missing.status_code == 404
    assert missing.json() == {"detail": "Dictionary word not found"}

    class FailedService:
        @staticmethod
        def get_word_by_id(_word_id):
            raise RuntimeError("private storage detail")

    failed = make_client(FailedService()).get("/api/vocabulary/words/failed")
    assert failed.status_code == 500
    assert failed.json() == {"detail": "Dictionary lookup failed"}
