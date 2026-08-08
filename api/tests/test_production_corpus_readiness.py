from scripts.check_production_corpus_readiness import production_readiness_rows


def test_no_external_source_is_misrepresented_as_production_ready() -> None:
    rows = production_readiness_rows()

    assert rows
    assert not any(row["ready"] for row in rows)
    assert all(row["permission_status"] != "missing" for row in rows)
