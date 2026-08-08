#!/usr/bin/env python3
"""Reproducible, source-grounded model benchmark for HåfaGPT.

The automated score is a regression signal, not a claim of Chamorro fluency.
Every production decision must also use the generated blinded review packet.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import math
import os
import random
import re
import statistics
import sys
import time
import unicodedata
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import httpx
from dotenv import load_dotenv


ROOT = Path(__file__).resolve().parents[1]
EVALUATION_DIR = Path(__file__).resolve().parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))
DEFAULT_CATALOG = EVALUATION_DIR / "model_catalog_2026.json"
DEFAULT_CASES = EVALUATION_DIR / "model_benchmark_cases.json"
DEFAULT_VOCABULARY = ROOT / "language_content" / "canonical_vocabulary.json"

SYSTEM_PROMPT = """You are HåfaGPT, a careful Chamorro language tutor.
Treat the supplied HåfaGPT reference as the only authority for this task.
Preserve Chamorro diacritics and glottal stops in recommended teaching terms.
Distinguish recommended teaching spellings from valid source-backed variants.
Do not invent language facts, literal translations, sources, or cultural claims.
If the reference does not contain the answer, clearly say that you cannot verify it
from the supplied reference. Be concise, respectful, and useful to a learner."""

UNCERTAINTY_PHRASES = (
    "cannot verify",
    "cannot be verified",
    "can't verify",
    "can't be verified",
    "do not have",
    "don't have",
    "not provided",
    "not in the supplied",
    "not verified",
    "do not mention",
    "does not mention",
    "no supplied reference",
    "insufficient information",
)


def load_json(path: Path) -> dict[str, Any]:
    with path.open(encoding="utf-8") as handle:
        return json.load(handle)


def file_sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(65536), b""):
            digest.update(chunk)
    return digest.hexdigest()


def normalize(text: str) -> str:
    text = text.casefold().replace("ʼ", "'").replace("’", "'").replace("`", "'")
    decomposed = unicodedata.normalize("NFD", text)
    without_diacritics = "".join(
        character for character in decomposed if unicodedata.category(character) != "Mn"
    )
    return without_diacritics.replace("'", "")


NORMALIZED_UNCERTAINTY_PHRASES = tuple(normalize(phrase) for phrase in UNCERTAINTY_PHRASES)


def compact_normalize(text: str) -> str:
    """Normalize names across file-style and human-readable source labels."""
    return re.sub(r"[^a-z0-9]", "", normalize(text))


def first_meaning(english: str) -> str:
    return re.split(r"\s*/\s*", english, maxsplit=1)[0].strip()


def build_reference(entry: dict[str, Any] | None) -> str:
    if entry is None:
        return "HÅFAGPT REFERENCE\nNo relevant entry was supplied."

    lines = [
        "HÅFAGPT REFERENCE",
        f"Entry ID: {entry['id']}",
        f"English: {entry['english']}",
        f"Recommended teaching term: {entry['recommended_teaching_term']}",
        f"Canonical Chamorro: {entry['canonical_chamorro']}",
        f"Confidence: {entry['confidence']}",
        f"Review status: {entry['review_status']}",
    ]
    variants = [
        variant["term"]
        for variant in entry.get("variants", [])
        if variant.get("status") == "source_backed"
    ]
    if variants:
        lines.append("Source-backed variants: " + "; ".join(variants))
    deprecated = entry.get("deprecated_app_terms", [])
    if deprecated:
        lines.append("Deprecated or incorrect app terms:")
        for item in deprecated:
            lines.append(f"- {item['term']}: {item['reason']}")
    lines.append("Sources:")
    for source in entry.get("source_citations", []):
        details = [source["source"]]
        if source.get("headword"):
            details.append(f"headword={source['headword']}")
        if source.get("definition"):
            details.append(f"definition={source['definition']}")
        lines.append("- " + " | ".join(details))
    return "\n".join(lines)


def strip_json_fence(content: str) -> str:
    match = re.fullmatch(r"\s*```(?:json)?\s*(.*?)\s*```\s*", content, flags=re.DOTALL | re.IGNORECASE)
    return match.group(1) if match else content.strip()


def build_task_text(case: dict[str, Any], entry: dict[str, Any] | None) -> str:
    task_text = case["question"]
    if case["workload"] == "structured_output" and entry is not None:
        task_text += f"\nTarget entry English: {entry['english']}"
    return task_text


def validate_retrieval_contract(
    reference_text: str,
    source_rows: list[tuple[str, str]],
    entry: dict[str, Any] | None,
    case_id: str,
) -> bool | None:
    """Reject unsupported answer evidence while preserving abstention cases."""
    # Uncertainty cases deliberately have no canonical target. Zero eligible
    # sources and an empty context are valid evidence that the model should
    # abstain rather than guess.
    if entry is None:
        return None
    if not reference_text.strip():
        raise ValueError(f"No governed retrieval context found for benchmark case {case_id}")
    if not source_rows:
        raise ValueError(f"No governed retrieval evidence found for benchmark case {case_id}")
    expected_term = normalize(entry["recommended_teaching_term"])
    expected_entry_present = expected_term in normalize(reference_text)
    if not expected_entry_present:
        raise ValueError(f"Governed retrieval missed the target entry for benchmark case {case_id}")
    return expected_entry_present


def score_response(case: dict[str, Any], entry: dict[str, Any] | None, content: str) -> dict[str, Any]:
    normalized_content = normalize(content)
    checks: dict[str, bool | None] = {
        "lexical": None,
        "orthography": None,
        "source": None,
        "format": None,
        "uncertainty": None,
        "variant": None,
    }

    if case["direction"] == "unknown":
        checks["uncertainty"] = any(
            phrase in normalized_content for phrase in NORMALIZED_UNCERTAINTY_PHRASES
        )
    elif entry is not None:
        if case["direction"] == "chamorro_to_english":
            checks["lexical"] = normalize(first_meaning(entry["english"])) in normalized_content
        else:
            teaching_term = entry["recommended_teaching_term"]
            checks["lexical"] = normalize(teaching_term) in normalized_content
            checks["orthography"] = teaching_term.casefold() in content.casefold()

        if case.get("require_source"):
            source_names = [source["source"] for source in entry.get("source_citations", [])]
            compact_content = compact_normalize(content)
            checks["source"] = any(
                normalize(source_name) in normalized_content
                or normalize(Path(source_name).stem) in normalized_content
                or compact_normalize(Path(source_name).stem) in compact_content
                for source_name in source_names
            )

        if case.get("require_variant"):
            variants = [
                variant["term"]
                for variant in entry.get("variants", [])
                if variant.get("status") == "source_backed"
            ]
            checks["variant"] = bool(variants) and any(normalize(term) in normalized_content for term in variants)

    parsed_json: dict[str, Any] | None = None
    if case.get("require_json"):
        try:
            candidate = json.loads(strip_json_fence(content))
            parsed_json = candidate if isinstance(candidate, dict) else None
        except json.JSONDecodeError:
            parsed_json = None
        required_keys = {"english", "chamorro", "confidence", "source"}
        checks["format"] = parsed_json is not None and required_keys.issubset(parsed_json)

    applicable = [value for value in checks.values() if value is not None]
    score = round(100 * sum(bool(value) for value in applicable) / len(applicable), 1) if applicable else 0.0
    return {"score": score, "checks": checks, "parsed_json": parsed_json}


def request_model(
    client: httpx.Client,
    api_key: str,
    model: dict[str, Any],
    case: dict[str, Any],
    entry: dict[str, Any] | None,
    max_tokens: int,
    reasoning_effort: str | None = None,
    reference_text: str | None = None,
    transport: str = "openrouter",
) -> dict[str, Any]:
    task_text = build_task_text(case, entry)
    direct_openai = transport == "openai"
    payload: dict[str, Any] = {
        "model": model["model_id"].removeprefix("openai/") if direct_openai else model["model_id"],
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {
                "role": "user",
                "content": f"{reference_text if reference_text is not None else build_reference(entry)}\n\nTASK\n{task_text}",
            },
        ],
    }
    if direct_openai:
        payload["max_completion_tokens"] = max_tokens
    else:
        payload["max_tokens"] = max_tokens
        payload["usage"] = {"include": True}
    if model.get("supports_temperature"):
        payload["temperature"] = 0
    if reasoning_effort:
        payload["reasoning_effort"] = reasoning_effort

    started = time.perf_counter()
    endpoint = (
        "https://api.openai.com/v1/chat/completions"
        if direct_openai
        else "https://openrouter.ai/api/v1/chat/completions"
    )
    headers = {"Authorization": f"Bearer {api_key}"}
    if not direct_openai:
        headers.update({
            "HTTP-Referer": "https://hafagpt.com",
            # HTTP header values must remain ASCII even though the product name
            # normally preserves the Chamorro å in user-facing text.
            "X-Title": "HafaGPT Model Benchmark",
        })
    response = client.post(
        endpoint,
        headers=headers,
        json=payload,
    )
    elapsed = time.perf_counter() - started
    response.raise_for_status()
    data = response.json()
    usage = data.get("usage") or {}
    content = data["choices"][0]["message"].get("content") or ""
    prompt_tokens = int(usage.get("prompt_tokens") or 0)
    completion_tokens = int(usage.get("completion_tokens") or 0)
    catalog_cost = (
        prompt_tokens * model["input_usd_per_million"]
        + completion_tokens * model["output_usd_per_million"]
    ) / 1_000_000
    return {
        "content": content,
        "returned_model": data.get("model"),
        "provider": data.get("provider") or ("openai-direct" if direct_openai else None),
        "finish_reason": data["choices"][0].get("finish_reason"),
        "latency_seconds": round(elapsed, 3),
        "prompt_tokens": prompt_tokens,
        "completion_tokens": completion_tokens,
        "total_tokens": int(usage.get("total_tokens") or prompt_tokens + completion_tokens),
        "reasoning_tokens": int(
            (usage.get("completion_tokens_details") or {}).get("reasoning_tokens") or 0
        ),
        "reported_cost_usd": usage.get("cost"),
        "catalog_cost_usd": round(catalog_cost, 8),
    }


def validate_inputs(catalog: dict[str, Any], cases: dict[str, Any], vocabulary: dict[str, Any]) -> None:
    aliases = [model["alias"] for model in catalog["models"]]
    if len(aliases) != len(set(aliases)):
        raise ValueError("Model aliases must be unique")
    entry_ids = {entry["id"] for entry in vocabulary["entries"]}
    case_ids: set[str] = set()
    for case in cases["cases"]:
        if case["id"] in case_ids:
            raise ValueError(f"Duplicate case ID: {case['id']}")
        case_ids.add(case["id"])
        if case.get("entry_id") and case["entry_id"] not in entry_ids:
            raise ValueError(f"Unknown canonical entry in {case['id']}: {case['entry_id']}")


def percentile(values: list[float], percentile_value: float) -> float | None:
    """Return a nearest-rank percentile, suitable for small benchmark samples."""
    if not values:
        return None
    ordered = sorted(values)
    rank = max(1, math.ceil(percentile_value * len(ordered)))
    return ordered[rank - 1]


def summarize(results: list[dict[str, Any]]) -> list[dict[str, Any]]:
    grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for result in results:
        grouped[result["model_alias"]].append(result)
    summaries = []
    for alias, rows in grouped.items():
        successes = [row for row in rows if not row.get("error")]
        latencies = [row["response"]["latency_seconds"] for row in successes]
        reported_costs = [
            row["response"].get("reported_cost_usd")
            for row in successes
            if row["response"].get("reported_cost_usd") is not None
        ]
        finish_reasons: dict[str, int] = defaultdict(int)
        for row in successes:
            finish_reasons[row["response"].get("finish_reason") or "unknown"] += 1
        contract_failures = sum(
            row["response"].get("finish_reason") != "stop"
            or row["evaluation"]["checks"].get("format") is False
            or row["evaluation"]["checks"].get("uncertainty") is False
            for row in successes
        )
        workload_rows: dict[str, list[dict[str, Any]]] = defaultdict(list)
        for row in successes:
            workload_rows[row["workload"]].append(row)
        summaries.append({
            "model_alias": alias,
            "model_id": rows[0]["model_id"],
            "cases_attempted": len(rows),
            "successful_calls": len(successes),
            "automated_score_mean": round(statistics.mean(row["evaluation"]["score"] for row in successes), 2) if successes else 0,
            "latency_p50_seconds": round(statistics.median(latencies), 3) if latencies else None,
            "latency_p95_seconds": round(percentile(latencies, 0.95), 3) if latencies else None,
            "latency_mean_seconds": round(statistics.mean(latencies), 3) if latencies else None,
            "tokens_total": sum(row["response"]["total_tokens"] for row in successes),
            "reasoning_tokens_total": sum(row["response"].get("reasoning_tokens", 0) for row in successes),
            "catalog_cost_usd": round(sum(row["response"]["catalog_cost_usd"] for row in successes), 6),
            "reported_cost_usd": round(sum(reported_costs), 6) if reported_costs else None,
            "reported_cost_coverage": f"{len(reported_costs)}/{len(successes)}",
            "finish_reasons": dict(sorted(finish_reasons.items())),
            "contract_failures": contract_failures,
            "workloads": {
                workload: {
                    "cases": len(workload_results),
                    "automated_score_mean": round(
                        statistics.mean(row["evaluation"]["score"] for row in workload_results), 2
                    ),
                }
                for workload, workload_results in sorted(workload_rows.items())
            },
        })
    return sorted(summaries, key=lambda row: (-row["automated_score_mean"], row["latency_mean_seconds"] or 9999))


def write_blind_review(results: list[dict[str, Any]], output_dir: Path, seed: int) -> None:
    rng = random.Random(seed)
    rows_by_case: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for result in results:
        if not result.get("error"):
            rows_by_case[result["case_id"]].append(result)

    review_rows: list[dict[str, Any]] = []
    key_rows: list[dict[str, str]] = []
    for case_id, rows in rows_by_case.items():
        rng.shuffle(rows)
        for index, row in enumerate(rows):
            label = f"{case_id}-{chr(65 + index)}"
            review_rows.append({
                "reviewer_id": "",
                "reviewed_at": "",
                "regional_expertise": "",
                "conflict_of_interest_yes_no": "",
                "case_id": case_id,
                "workload": row["workload"],
                "response_label": label,
                "question": row["question"],
                "response": row["response"]["content"],
                "accuracy_1_to_5": "",
                "grammar_naturalness_1_to_5": "",
                "orthography_1_to_5": "",
                "cultural_appropriateness_1_to_5": "",
                "teaching_usefulness_1_to_5": "",
                "uncertainty_source_faithfulness_1_to_5": "",
                "critical_error_yes_no": "",
                "reviewer_notes": "",
            })
            key_rows.append({"response_label": label, "model_alias": row["model_alias"], "model_id": row["model_id"]})

    fieldnames = list(review_rows[0]) if review_rows else []
    with (output_dir / "blind_human_review.csv").open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        if fieldnames:
            writer.writeheader()
            writer.writerows(review_rows)
    with (output_dir / "blind_review_key.json").open("w", encoding="utf-8") as handle:
        json.dump(key_rows, handle, ensure_ascii=False, indent=2)


def rescore_results(
    source_path: Path,
    cases_document: dict[str, Any],
    vocabulary: dict[str, Any],
) -> Path:
    """Reapply current deterministic checks to preserved responses without new API calls."""
    artifact = load_json(source_path)
    cases = {case["id"]: case for case in cases_document["cases"]}
    entries = {entry["id"]: entry for entry in vocabulary["entries"]}
    for row in artifact["results"]:
        if row.get("error"):
            continue
        case = cases[row["case_id"]]
        entry = entries.get(row.get("entry_id"))
        row["evaluation"] = score_response(case, entry, row["response"]["content"])
    artifact["summaries"] = summarize(artifact["results"])
    artifact["rescored_at"] = datetime.now(timezone.utc).isoformat()
    artifact["rescored_from"] = source_path.name
    output_path = source_path.with_name("results_rescored.json")
    with output_path.open("w", encoding="utf-8") as handle:
        json.dump(artifact, handle, ensure_ascii=False, indent=2)
    write_blind_review(
        artifact["results"],
        source_path.parent,
        artifact.get("request_config", {}).get("seed", 20260805),
    )
    return output_path


def check_openrouter_catalog(catalog: dict[str, Any]) -> list[str]:
    response = httpx.get("https://openrouter.ai/api/v1/models", timeout=30)
    response.raise_for_status()
    available = {model["id"] for model in response.json()["data"]}
    return [model["model_id"] for model in catalog["models"] if model["model_id"] not in available]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--models", help="Comma-separated aliases; default is every catalog model")
    parser.add_argument(
        "--transport",
        choices=("openrouter", "openai"),
        default="openrouter",
        help="Provider path. Direct OpenAI accepts only catalog entries whose IDs start with openai/.",
    )
    parser.add_argument("--case-ids", help="Comma-separated case IDs; default is every benchmark case")
    parser.add_argument("--limit", type=int, help="Limit cases for a smoke run")
    parser.add_argument("--max-tokens", type=int, default=1200)
    parser.add_argument(
        "--reasoning-effort",
        choices=("none", "low", "medium", "high", "xhigh", "max"),
        help="Optional Chat Completions reasoning effort for compatible models",
    )
    parser.add_argument("--timeout", type=float, default=120)
    parser.add_argument("--seed", type=int, default=20260805)
    parser.add_argument("--output-dir", type=Path)
    parser.add_argument(
        "--rescore-results",
        type=Path,
        help="Reapply current scoring/reporting to an existing results.json without API calls",
    )
    parser.add_argument("--validate-only", action="store_true")
    parser.add_argument("--check-catalog", action="store_true")
    parser.add_argument(
        "--rag-collection",
        help="Use governed live retrieval from this collection instead of supplying the canonical answer directly",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    load_dotenv(ROOT / ".env")
    catalog = load_json(DEFAULT_CATALOG)
    cases_document = load_json(DEFAULT_CASES)
    vocabulary = load_json(DEFAULT_VOCABULARY)
    validate_inputs(catalog, cases_document, vocabulary)

    if args.rescore_results:
        output_path = rescore_results(args.rescore_results, cases_document, vocabulary)
        print(f"Rescored results: {output_path}")
        return 0

    if args.check_catalog:
        missing = check_openrouter_catalog(catalog)
        if missing:
            print("Catalog models missing from OpenRouter:", ", ".join(missing), file=sys.stderr)
            return 1
        print(f"Catalog check passed: {len(catalog['models'])} models are currently available.")

    entries = {entry["id"]: entry for entry in vocabulary["entries"]}
    cases = cases_document["cases"]
    if args.case_ids:
        requested_case_ids = {value.strip() for value in args.case_ids.split(",") if value.strip()}
        cases = [case for case in cases if case["id"] in requested_case_ids]
        missing_case_ids = requested_case_ids - {case["id"] for case in cases}
        if missing_case_ids:
            print(f"Unknown case IDs: {', '.join(sorted(missing_case_ids))}", file=sys.stderr)
            return 2
    if args.limit:
        cases = cases[: args.limit]
    selected_aliases = args.models.split(",") if args.models else [model["alias"] for model in catalog["models"]]
    selected_models = [model for model in catalog["models"] if model["alias"] in selected_aliases]
    unknown_aliases = set(selected_aliases) - {model["alias"] for model in selected_models}
    if unknown_aliases:
        print(f"Unknown model aliases: {', '.join(sorted(unknown_aliases))}", file=sys.stderr)
        return 2
    if args.transport == "openai":
        incompatible = [model["alias"] for model in selected_models if not model["model_id"].startswith("openai/")]
        if incompatible:
            print(
                "Direct OpenAI transport is incompatible with: " + ", ".join(incompatible),
                file=sys.stderr,
            )
            return 2

    print(f"Validated {len(cases_document['cases'])} cases and {len(catalog['models'])} model definitions.")
    if args.validate_only:
        return 0

    api_key_name = "OPENAI_API_KEY" if args.transport == "openai" else "OPENROUTER_API_KEY"
    api_key = os.getenv(api_key_name)
    if not api_key:
        print(
            f"{api_key_name} is not configured. Put it in api/.env or export it in your shell; "
            "do not add the key to source control.",
            file=sys.stderr,
        )
        return 3

    rag = None
    if args.rag_collection:
        from src.rag.chamorro_rag import ChamorroRAG

        rag = ChamorroRAG(
            collection_name=args.rag_collection,
            intended_use="model_evaluation",
        )

    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    output_dir = args.output_dir or EVALUATION_DIR / "tmp" / f"model_benchmark_{timestamp}"
    output_dir.mkdir(parents=True, exist_ok=False)

    results: list[dict[str, Any]] = []
    with httpx.Client(timeout=args.timeout) as client:
        for model in selected_models:
            print(f"\n{model['alias']} ({model['model_id']})")
            for index, case in enumerate(cases, start=1):
                entry = entries.get(case.get("entry_id"))
                print(f"  [{index}/{len(cases)}] {case['id']}", end="", flush=True)
                row: dict[str, Any] = {
                    "model_alias": model["alias"],
                    "model_id": model["model_id"],
                    "case_id": case["id"],
                    "workload": case["workload"],
                    "question": case["question"],
                    "entry_id": case.get("entry_id"),
                }
                try:
                    reference_text = None
                    retrieved_sources: list[dict[str, Any]] = []
                    if rag is not None:
                        retrieval_query = case["question"]
                        if case["workload"] == "structured_output" and entry is not None:
                            retrieval_query += f" Target entry English: {entry['english']}"
                        reference_text, source_rows = rag.create_context(retrieval_query, k=5)
                        expected_entry_present = validate_retrieval_contract(
                            reference_text,
                            source_rows,
                            entry,
                            case["id"],
                        )
                        retrieved_sources = [
                            {"name": name, "page": page}
                            for name, page in source_rows
                        ]
                        row["retrieval"] = {
                            "collection": args.rag_collection,
                            "query": retrieval_query,
                            "context_sha256": hashlib.sha256(reference_text.encode("utf-8")).hexdigest(),
                            "context_present": bool(reference_text),
                            "expected_entry_present": expected_entry_present,
                            "sources": retrieved_sources,
                        }
                    response = request_model(
                        client,
                        api_key,
                        model,
                        case,
                        entry,
                        args.max_tokens,
                        args.reasoning_effort,
                        reference_text,
                        args.transport,
                    )
                    row["response"] = response
                    row["evaluation"] = score_response(case, entry, response["content"])
                    print(f" -> {row['evaluation']['score']:.0f} ({response['latency_seconds']:.2f}s)")
                except Exception as error:  # Preserve failures in the audit artifact.
                    row["error"] = f"{type(error).__name__}: {error}"
                    print(f" -> ERROR: {error}")
                results.append(row)

    artifact = {
        "schema_version": 1,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "automated_score_warning": "Regression signal only. Not proof of Chamorro correctness or model superiority.",
        "catalog_checked_at": catalog["checked_at"],
        "catalog_sha256": file_sha256(DEFAULT_CATALOG),
        "cases_sha256": file_sha256(DEFAULT_CASES),
        "canonical_vocabulary_sha256": file_sha256(DEFAULT_VOCABULARY),
        "models": selected_aliases,
        "case_count": len(cases),
        "request_config": {
            "max_tokens": args.max_tokens,
            "reasoning_effort": args.reasoning_effort,
            "rag_collection": args.rag_collection,
            "transport": args.transport,
            "seed": args.seed,
        },
        "summaries": summarize(results),
        "results": results,
    }
    with (output_dir / "results.json").open("w", encoding="utf-8") as handle:
        json.dump(artifact, handle, ensure_ascii=False, indent=2)
    write_blind_review(results, output_dir, args.seed)
    print(f"\nResults: {output_dir / 'results.json'}")
    print(f"Blind review packet: {output_dir / 'blind_human_review.csv'}")
    return 1 if any(result.get("error") for result in results) else 0


if __name__ == "__main__":
    raise SystemExit(main())
