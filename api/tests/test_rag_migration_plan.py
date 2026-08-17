from __future__ import annotations

import pytest

from scripts.plan_rag_collection_migration import (
    build_migration_plan,
    validate_target_collection,
)


def audit_fixture(*, unregistered_chunks: int = 0) -> dict:
    return {
        "collection": {"name": "chamorro_grammar", "id": "source-id"},
        "summary": {
            "total_rows": 12,
            "unique_documents": 10,
            "redundant_exact_rows": 2,
            "exact_redundancy_percent": 16.67,
        },
        "policy": {
            "by_source_id": {"chung_grammar_2020": 8, "guampedia": 4},
            "blocked_chunks": 4,
            "unregistered_chunks": unregistered_chunks,
        },
    }


def test_target_must_be_new_and_versioned() -> None:
    with pytest.raises(ValueError, match="must differ"):
        validate_target_collection("chamorro_grammar", "chamorro_grammar")
    with pytest.raises(ValueError, match="must start"):
        validate_target_collection("chamorro_grammar", "cleaned")

    validate_target_collection("chamorro_grammar", "hafagpt_governed_v1")


def test_plan_preserves_held_sources_and_refuses_build_without_permissions() -> None:
    plan = build_migration_plan(
        audit_fixture(),
        "hafagpt_governed_v1",
        [
            {"source_id": "chung_grammar_2020", "ready": False},
            {"source_id": "guampedia", "ready": False},
        ],
        target_exists=False,
    )

    assert plan["can_build"] is False
    assert plan["eligible_source_ids"] == []
    assert plan["held_not_reingested_source_ids"] == [
        "chung_grammar_2020",
        "guampedia",
    ]
    assert plan["preservation"]["source_collection_unchanged"] is True
    assert plan["preservation"]["delete_operations"] == 0
    assert any("no held external source" in blocker for blocker in plan["blockers"])


def test_plan_is_actionable_only_for_ready_sources_and_unused_target() -> None:
    plan = build_migration_plan(
        audit_fixture(),
        "hafagpt_governed_v1",
        [
            {"source_id": "chung_grammar_2020", "ready": True},
            {"source_id": "guampedia", "ready": False},
        ],
        target_exists=False,
    )

    assert plan["can_build"] is True
    assert plan["eligible_source_ids"] == ["chung_grammar_2020"]
    assert plan["held_not_reingested_source_ids"] == ["guampedia"]


def test_existing_target_and_unregistered_chunks_block_the_plan() -> None:
    plan = build_migration_plan(
        audit_fixture(unregistered_chunks=2),
        "hafagpt_governed_v1",
        [{"source_id": "chung_grammar_2020", "ready": True}],
        target_exists=True,
    )

    assert plan["can_build"] is False
    assert any("already exists" in blocker for blocker in plan["blockers"])
    assert any("unregistered" in blocker for blocker in plan["blockers"])
