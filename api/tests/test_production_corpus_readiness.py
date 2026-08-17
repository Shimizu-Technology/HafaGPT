from scripts.check_production_corpus_readiness import _artifact_keys, production_readiness_rows


def test_no_external_source_is_misrepresented_as_production_ready() -> None:
    rows = production_readiness_rows()

    assert rows
    assert not any(row["ready"] for row in rows)
    assert all(row["permission_status"] != "missing" for row in rows)


def test_artifact_readiness_keys_include_version_and_checksum() -> None:
    assert _artifact_keys(
        [{"version": "2020-edition", "sha256": "A" * 64}]
    ) == {("2020-edition", "a" * 64)}
    assert _artifact_keys([{"version": "2020-edition"}]) == set()
