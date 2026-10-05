"""Serialize XP awards and make authored lesson milestones retry-safe."""


def lock_and_check_xp_award(cursor, *, user_id: str, activity_type: str,
                            activity_id: str | None, deduplicate: bool) -> bool:
    # A user-level lock also covers the first award, where no user_xp row exists.
    cursor.execute("SELECT pg_advisory_xact_lock(hashtextextended(%s, 0))",
                   (f"xp:{user_id}",))
    if not deduplicate:
        return False
    if not isinstance(activity_id, str) or not activity_id or len(activity_id) > 100:
        raise ValueError("A bounded activity_id is required for retry-safe XP")
    cursor.execute(
        "SELECT 1 FROM xp_history WHERE user_id = %s AND activity_type = %s AND activity_id = %s LIMIT 1",
        (user_id, activity_type, activity_id),
    )
    return cursor.fetchone() is not None
