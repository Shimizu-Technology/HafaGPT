from src.rag.connection_safety import redact_database_url


def test_database_manager_redacts_credentials_and_query_parameters() -> None:
    rendered = redact_database_url(
        "postgresql://app-user:top-secret@db.example.com:5432/hafagpt?sslmode=require&token=secret"
    )

    assert rendered == "postgresql://***@db.example.com:5432/hafagpt"
    assert "top-secret" not in rendered
    assert "token" not in rendered


def test_database_manager_hides_unparseable_connection_strings() -> None:
    assert redact_database_url("local-profile") == "<configured database>"
