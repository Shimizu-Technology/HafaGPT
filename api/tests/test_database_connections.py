from api import database_connections


def test_retrying_connection_forwards_timeouts_on_every_attempt(monkeypatch):
    attempts = []
    sleeps = []
    connection = object()

    def connect(database_url, **kwargs):
        attempts.append((database_url, kwargs))
        if len(attempts) == 1:
            raise ConnectionError("temporary network failure")
        return connection

    monkeypatch.setenv("DATABASE_URL", "postgresql://example.invalid/hafagpt")
    monkeypatch.setattr(database_connections.psycopg, "connect", connect)
    monkeypatch.setattr(database_connections.time, "sleep", sleeps.append)

    result = database_connections.get_db_connection_with_retry(
        max_retries=2,
        retry_delay=0.25,
        connect_timeout=5,
        options="-c statement_timeout=5000",
    )

    assert result is connection
    assert attempts == [
        (
            "postgresql://example.invalid/hafagpt",
            {"connect_timeout": 5, "options": "-c statement_timeout=5000"},
        ),
        (
            "postgresql://example.invalid/hafagpt",
            {"connect_timeout": 5, "options": "-c statement_timeout=5000"},
        ),
    ]
    assert sleeps == [0.25]
