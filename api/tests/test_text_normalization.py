import pytest

from src.rag.text_normalization import normalize_chamorro_match_text


@pytest.mark.parametrize(
    "value",
    (
        "Si Yu'os Ma'åse'",
        "Si Yu’os Maase",
        "SI YUOS MAASE",
        "Si Yu os Ma ase",
    ),
)
def test_match_normalization_tolerates_phone_and_ocr_spelling_loss(value: str) -> None:
    assert normalize_chamorro_match_text(value) == "si yuos maase"


def test_match_normalization_is_not_a_display_transcription() -> None:
    source_text = "TÅYA' KLAS PÅ'GO"

    assert normalize_chamorro_match_text(source_text) == "taya klas pago"
    assert source_text == "TÅYA' KLAS PÅ'GO"


@pytest.mark.parametrize(
    ("value", "expected"),
    (
        ("S.Y.M.", "sym"),
        ("S Y M", "sym"),
        ("M.S.Y.", "msy"),
        ("M S Y", "msy"),
    ),
)
def test_match_normalization_repairs_school_acronym_ocr_spacing(
    value: str,
    expected: str,
) -> None:
    assert normalize_chamorro_match_text(value) == expected
