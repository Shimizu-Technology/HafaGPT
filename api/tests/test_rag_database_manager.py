from src.rag.connection_safety import metadata_file_for_collection, redact_database_url


def test_database_manager_redacts_credentials_and_query_parameters() -> None:
    rendered = redact_database_url(
        "postgresql://app-user:top-secret@db.example.com:5432/hafagpt?sslmode=require&token=secret"
    )

    assert rendered == "postgresql://***@db.example.com:5432/hafagpt"
    assert "top-secret" not in rendered
    assert "token" not in rendered


def test_database_manager_hides_unparseable_connection_strings() -> None:
    assert redact_database_url("local-profile") == "<configured database>"
    assert (
        redact_database_url("postgresql://user:secret@db.example.com:not-a-port/hafagpt")
        == "<configured database>"
    )
    assert (
        redact_database_url("postgresql://user:secret@fragment@db.example.com/hafagpt")
        == "<configured database>"
    )


def test_metadata_tracking_is_isolated_by_collection() -> None:
    assert metadata_file_for_collection("chamorro_grammar") == "./rag_metadata.json"
    assert (
        metadata_file_for_collection("hafagpt_governed_v1")
        == "./rag_metadata.hafagpt_governed_v1.json"
    )
    assert (
        metadata_file_for_collection("hafagpt_governed_v1", explicit_path="custom.json")
        == "custom.json"
    )
