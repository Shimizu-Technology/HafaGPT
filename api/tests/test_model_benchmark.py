from __future__ import annotations

import json
from pathlib import Path

import pytest

from evaluation.model_benchmark import (
    build_reference,
    build_task_text,
    load_json,
    percentile,
    score_response,
    summarize,
    validate_inputs,
)


API_ROOT = Path(__file__).resolve().parents[1]
EVALUATION_DIR = API_ROOT / "evaluation"
VOCABULARY_PATH = API_ROOT / "language_content" / "canonical_vocabulary.json"


def benchmark_documents():
    catalog = load_json(EVALUATION_DIR / "model_catalog_2026.json")
    cases = load_json(EVALUATION_DIR / "model_benchmark_cases.json")
    vocabulary = load_json(VOCABULARY_PATH)
    return catalog, cases, vocabulary


def test_benchmark_inputs_reference_existing_canonical_entries() -> None:
    catalog, cases, vocabulary = benchmark_documents()
    validate_inputs(catalog, cases, vocabulary)

    assert len(catalog["models"]) == 8
    assert len(cases["cases"]) == 24


def test_reference_contains_source_and_recommended_term() -> None:
    _catalog, _cases, vocabulary = benchmark_documents()
    entry = next(item for item in vocabulary["entries"] if item["id"] == "food.water")

    reference = build_reference(entry)

    assert "Recommended teaching term: Hånom" in reference
    assert "Source-backed variants: Hanom; Hånum" in reference
    assert "revised_and_updated_chamorro_dictionary.json" in reference


def test_scoring_keeps_orthography_separate_from_normalized_match() -> None:
    _catalog, cases, vocabulary = benchmark_documents()
    case = next(item for item in cases["cases"] if item["id"] == "translate_white")
    entry = next(item for item in vocabulary["entries"] if item["id"] == case["entry_id"])

    evaluation = score_response(
        case,
        entry,
        "The term is Apaka, according to the Revised and Updated Chamorro Dictionary.",
    )

    assert evaluation["checks"]["lexical"] is True
    assert evaluation["checks"]["orthography"] is False
    assert evaluation["checks"]["source"] is True


def test_structured_output_requires_json_keys() -> None:
    _catalog, cases, vocabulary = benchmark_documents()
    case = next(item for item in cases["cases"] if item["id"] == "structured_red")
    entry = next(item for item in vocabulary["entries"] if item["id"] == case["entry_id"])
    response = json.dumps(
        {
            "english": "Red",
            "chamorro": "Agaga'",
            "confidence": "high",
            "source": "revised_and_updated_chamorro_dictionary.json",
        }
    )

    evaluation = score_response(case, entry, response)

    assert evaluation["checks"]["format"] is True
    assert evaluation["score"] == 100.0


def test_structured_task_names_the_target_entry() -> None:
    _catalog, cases, vocabulary = benchmark_documents()
    case = next(item for item in cases["cases"] if item["id"] == "structured_red")
    entry = next(item for item in vocabulary["entries"] if item["id"] == case["entry_id"])

    assert build_task_text(case, entry).endswith("Target entry English: Red")


def test_unknown_case_requires_explicit_uncertainty() -> None:
    _catalog, cases, _vocabulary = benchmark_documents()
    case = next(item for item in cases["cases"] if item["id"] == "unknown_word")

    good = score_response(case, None, "I cannot verify that from the supplied reference.")
    bad = score_response(case, None, "Flarnibex means finaflårni.")

    assert good["score"] == 100.0
    assert bad["score"] == 0.0


def test_unknown_case_accepts_normalized_contraction() -> None:
    _catalog, cases, _vocabulary = benchmark_documents()
    case = next(item for item in cases["cases"] if item["id"] == "unknown_word")

    evaluation = score_response(case, None, "I can’t verify that from the supplied reference.")

    assert evaluation["score"] == 100.0


@pytest.mark.parametrize(
    "answer",
    (
        "The translation cannot be verified from the supplied references.",
        "That fictional festival is not verified in the supplied material.",
        "The supplied references do not mention that claim.",
    ),
)
def test_unknown_case_accepts_equivalent_abstention_language(answer: str) -> None:
    _catalog, cases, _vocabulary = benchmark_documents()
    case = next(item for item in cases["cases"] if item["id"] == "unknown_word")

    assert score_response(case, None, answer)["score"] == 100.0


def test_summary_uses_reported_cost_and_exposes_contract_metrics() -> None:
    rows = [
        {
            "model_alias": "candidate",
            "model_id": "provider/candidate",
            "workload": "structured_output",
            "response": {
                "latency_seconds": latency,
                "total_tokens": 100,
                "reasoning_tokens": 20,
                "catalog_cost_usd": 0.001,
                "reported_cost_usd": 0.003,
                "finish_reason": "length" if index == 2 else "stop",
            },
            "evaluation": {
                "score": 25.0 if index == 2 else 100.0,
                "checks": {"format": index != 2, "uncertainty": None},
            },
        }
        for index, latency in enumerate([1.0, 2.0, 8.0])
    ]

    summary = summarize(rows)[0]

    assert percentile([1.0, 2.0, 8.0], 0.95) == 8.0
    assert summary["reported_cost_usd"] == 0.009
    assert summary["reported_cost_coverage"] == "3/3"
    assert summary["reasoning_tokens_total"] == 60
    assert summary["contract_failures"] == 1
    assert summary["latency_p95_seconds"] == 8.0
