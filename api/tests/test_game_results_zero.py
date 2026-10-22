"""A completed loss is a result, including truthful zero stars and zero points."""
import pytest
from pydantic import ValidationError
from api.models import GameResultCreate


@pytest.mark.parametrize("game_type", ["chamorro_wordle", "word_catch", "falling_words"])
def test_completed_zero_result_is_valid(game_type):
    result = GameResultCreate(game_type=game_type, category_id="greetings", score=0, stars=0)
    assert result.score == result.stars == 0


@pytest.mark.parametrize("stars", [-1, 4])
def test_star_rating_rejects_out_of_range_values(stars):
    with pytest.raises(ValidationError):
        GameResultCreate(game_type="chamorro_wordle", category_id="daily", score=0, stars=stars)
