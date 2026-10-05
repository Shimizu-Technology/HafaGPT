import pytest
from api.xp_awards import lock_and_check_xp_award

class Cursor:
    def __init__(self, existing=None): self.existing = existing; self.calls = []
    def execute(self, query, params): self.calls.append((query, params))
    def fetchone(self): return self.existing

def test_lesson_xp_retry_checks_existing_award_under_transaction_lock():
    cursor = Cursor((1,))
    assert lock_and_check_xp_award(cursor, user_id="learner", activity_type="quiz_complete", activity_id="greetings", deduplicate=True)
    assert "pg_advisory_xact_lock" in cursor.calls[0][0]
    assert cursor.calls[1][1] == ("learner", "quiz_complete", "greetings")

def test_first_lesson_award_and_legacy_awards_remain_available():
    cursor = Cursor()
    assert not lock_and_check_xp_award(cursor, user_id="learner", activity_type="quiz_complete", activity_id="greetings", deduplicate=True)
    cursor = Cursor((1,))
    assert not lock_and_check_xp_award(cursor, user_id="learner", activity_type="game_complete", activity_id=None, deduplicate=False)
    assert len(cursor.calls) == 1

@pytest.mark.parametrize("activity_id", [None, "", "x" * 101])
def test_retry_safe_awards_require_bounded_identity(activity_id):
    with pytest.raises(ValueError):
        lock_and_check_xp_award(Cursor(), user_id="learner", activity_type="quiz_complete", activity_id=activity_id, deduplicate=True)
