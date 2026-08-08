from __future__ import annotations

import csv
from pathlib import Path

import pytest

from evaluation.validate_blind_reviews import RATING_COLUMNS, validate_independent_reviews


def write_review(path: Path, reviewer_id: str, labels: tuple[str, ...] = ("case-A", "case-B")) -> None:
    rows = []
    for label in labels:
        row = {
            "reviewer_id": reviewer_id,
            "reviewed_at": "2026-08-08T12:00:00+10:00",
            "regional_expertise": "Guam Chamorro educator",
            "conflict_of_interest_yes_no": "no",
            "case_id": "case",
            "workload": "grounded_translation",
            "response_label": label,
            "question": "Question",
            "response": "Response",
            "critical_error_yes_no": "no",
        }
        row.update({column: "5" for column in RATING_COLUMNS})
        rows.append(row)
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)


def test_two_independent_complete_reviews_are_required(tmp_path: Path) -> None:
    first = tmp_path / "first.csv"
    second = tmp_path / "second.csv"
    write_review(first, "reviewer-one")
    write_review(second, "reviewer-two")

    assert validate_independent_reviews([first, second]) == ("reviewer-one", "reviewer-two", 2)


def test_duplicate_reviewer_is_rejected(tmp_path: Path) -> None:
    first = tmp_path / "first.csv"
    second = tmp_path / "second.csv"
    write_review(first, "same-reviewer")
    write_review(second, "same-reviewer")

    with pytest.raises(ValueError, match="different reviewers"):
        validate_independent_reviews([first, second])


def test_mismatched_blind_packets_are_rejected(tmp_path: Path) -> None:
    first = tmp_path / "first.csv"
    second = tmp_path / "second.csv"
    write_review(first, "reviewer-one")
    write_review(second, "reviewer-two", labels=("case-A", "case-C"))

    with pytest.raises(ValueError, match="identical blind response packets"):
        validate_independent_reviews([first, second])
