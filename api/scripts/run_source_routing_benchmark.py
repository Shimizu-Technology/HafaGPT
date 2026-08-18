#!/usr/bin/env python3
"""Run the deterministic governed-source routing release benchmark."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from src.rag.knowledge_cards import matching_production_cards
from src.rag.query_classification import detect_query_type
from src.rag.query_routing import should_use_rag


BENCHMARK_PATH = (
    Path(__file__).resolve().parents[1]
    / "evaluation"
    / "source_routing_cases.json"
)
EXPECTED_CASE_FIELDS = {
    "id",
    "query",
    "expected_query_type",
    "expected_route",
    "expected_card_ids",
}
QUERY_TYPES = {"lookup", "educational", "usage", "cultural", "historical"}
ROUTES = {"knowledge_card_full", "vector_full", "vector_light", "no_rag"}


def load_benchmark(path: Path = BENCHMARK_PATH) -> dict[str, Any]:
    with path.open(encoding="utf-8") as handle:
        document = json.load(handle)
    if document.get("schema_version") != 1:
        raise ValueError("source routing benchmark schema_version must be 1")
    cases = document.get("cases")
    if not isinstance(cases, list) or not cases:
        raise ValueError("source routing benchmark requires cases")

    seen_ids: set[str] = set()
    for case in cases:
        if not isinstance(case, dict) or set(case) != EXPECTED_CASE_FIELDS:
            raise ValueError("source routing benchmark case fields are invalid")
        case_id = case["id"]
        if not isinstance(case_id, str) or not case_id or case_id in seen_ids:
            raise ValueError(f"invalid or duplicate benchmark case id: {case_id}")
        seen_ids.add(case_id)
        if not isinstance(case["query"], str) or not case["query"].strip():
            raise ValueError(f"benchmark case {case_id} requires a query")
        if case["expected_query_type"] not in QUERY_TYPES:
            raise ValueError(f"benchmark case {case_id} has invalid query type")
        if case["expected_route"] not in ROUTES:
            raise ValueError(f"benchmark case {case_id} has invalid route")
        if not isinstance(case["expected_card_ids"], list) or not all(
            isinstance(card_id, str) and card_id for card_id in case["expected_card_ids"]
        ):
            raise ValueError(f"benchmark case {case_id} has invalid card ids")
        has_cards = bool(case["expected_card_ids"])
        if has_cards != case["expected_route"].startswith("knowledge_card"):
            raise ValueError(f"benchmark case {case_id} route and card ids disagree")
    return document


def evaluate_case(case: dict[str, Any]) -> dict[str, Any]:
    actual_query_type = detect_query_type(case["query"])
    use_rag, rag_mode = should_use_rag(case["query"])
    actual_card_ids = [
        card["id"] for card in matching_production_cards(case["query"])
    ]
    if not use_rag:
        actual_route = "no_rag"
    elif actual_card_ids:
        actual_route = f"knowledge_card_{rag_mode}"
    else:
        actual_route = f"vector_{rag_mode}"
    passed = (
        actual_query_type == case["expected_query_type"]
        and actual_route == case["expected_route"]
        and actual_card_ids == case["expected_card_ids"]
    )
    return {
        "id": case["id"],
        "passed": passed,
        "actual_query_type": actual_query_type,
        "actual_route": actual_route,
        "actual_card_ids": actual_card_ids,
    }


def run_benchmark(path: Path = BENCHMARK_PATH) -> list[dict[str, Any]]:
    return [evaluate_case(case) for case in load_benchmark(path)["cases"]]


def main() -> int:
    results = run_benchmark()
    failures = [result for result in results if not result["passed"]]
    if failures:
        print(json.dumps({"status": "failed", "failures": failures}, indent=2))
        return 1
    print(f"Source routing benchmark OK: {len(results)}/{len(results)} cases")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
