#!/usr/bin/env python3
"""Validate two independently completed HåfaGPT blind-review worksheets."""

from __future__ import annotations

import argparse
import csv
from datetime import datetime
from pathlib import Path


RATING_COLUMNS = (
    "accuracy_1_to_5",
    "grammar_naturalness_1_to_5",
    "orthography_1_to_5",
    "cultural_appropriateness_1_to_5",
    "teaching_usefulness_1_to_5",
    "uncertainty_source_faithfulness_1_to_5",
)


def load_completed_review(path: Path) -> tuple[str, dict[str, tuple[str, str, str, str]]]:
    with path.open(encoding="utf-8", newline="") as handle:
        rows = list(csv.DictReader(handle))
    if not rows:
        raise ValueError(f"{path}: review is empty")

    reviewer_ids = {row.get("reviewer_id", "").strip() for row in rows}
    reviewed_dates = {row.get("reviewed_at", "").strip() for row in rows}
    expertise = {row.get("regional_expertise", "").strip() for row in rows}
    conflicts = {row.get("conflict_of_interest_yes_no", "").strip().casefold() for row in rows}
    if len(reviewer_ids) != 1 or not next(iter(reviewer_ids)):
        raise ValueError(f"{path}: use one non-empty reviewer_id throughout")
    if len(reviewed_dates) != 1:
        raise ValueError(f"{path}: use one reviewed_at value throughout")
    try:
        datetime.fromisoformat(next(iter(reviewed_dates)))
    except ValueError as error:
        raise ValueError(f"{path}: reviewed_at must be ISO-8601") from error
    if len(expertise) != 1 or not next(iter(expertise)):
        raise ValueError(f"{path}: regional_expertise is required")
    if conflicts - {"yes", "no"} or len(conflicts) != 1:
        raise ValueError(f"{path}: conflict_of_interest_yes_no must be yes or no")

    label_payloads: dict[str, tuple[str, str, str, str]] = {}
    for row_number, row in enumerate(rows, start=2):
        label = row.get("response_label", "").strip()
        if not label or label in label_payloads:
            raise ValueError(f"{path}:{row_number}: missing or duplicate response_label")
        label_payloads[label] = tuple(
            row.get(column, "")
            for column in ("case_id", "workload", "question", "response")
        )
        for column in RATING_COLUMNS:
            try:
                rating = int(row.get(column, ""))
            except (TypeError, ValueError) as error:
                raise ValueError(f"{path}:{row_number}: {column} must be an integer from 1 to 5") from error
            if rating not in range(1, 6):
                raise ValueError(f"{path}:{row_number}: {column} must be from 1 to 5")
        if row.get("critical_error_yes_no", "").strip().casefold() not in {"yes", "no"}:
            raise ValueError(f"{path}:{row_number}: critical_error_yes_no must be yes or no")
    return next(iter(reviewer_ids)), label_payloads


def validate_independent_reviews(paths: list[Path]) -> tuple[str, str, int]:
    if len(paths) != 2:
        raise ValueError("exactly two independently completed review files are required")
    first_reviewer, first_payloads = load_completed_review(paths[0])
    second_reviewer, second_payloads = load_completed_review(paths[1])
    if first_reviewer == second_reviewer:
        raise ValueError("reviewer_id values must identify two different reviewers")
    if first_payloads != second_payloads:
        raise ValueError("both reviewers must rate identical blind response packets")
    return first_reviewer, second_reviewer, len(first_payloads)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("reviews", nargs=2, type=Path)
    args = parser.parse_args()
    reviewers = validate_independent_reviews(args.reviews)
    print(f"Validated {reviewers[2]} blind responses from reviewers {reviewers[0]} and {reviewers[1]}.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
