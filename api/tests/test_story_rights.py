from __future__ import annotations

from api import story_service


def test_copied_stories_fail_closed_without_permission(monkeypatch) -> None:
    monkeypatch.delenv("LENGGUAHITA_STORIES_ENABLED", raising=False)
    monkeypatch.delenv("LENGGUAHITA_STORIES_PERMISSION_ID", raising=False)
    story_service.reset_story_cache()

    availability = story_service.get_story_availability()

    assert availability["status"] == "permission_required"
    assert availability["enabled"] is False
    assert story_service.get_available_stories() == []
    assert story_service.get_story("anything") is None


def test_boolean_flag_without_permission_record_still_fails_closed(monkeypatch) -> None:
    monkeypatch.setenv("LENGGUAHITA_STORIES_ENABLED", "true")
    monkeypatch.delenv("LENGGUAHITA_STORIES_PERMISSION_ID", raising=False)
    story_service.reset_story_cache()

    assert story_service.get_story_availability()["enabled"] is False


def test_unregistered_permission_identifier_cannot_restore_story_access(monkeypatch) -> None:
    monkeypatch.setenv("LENGGUAHITA_STORIES_ENABLED", "true")
    monkeypatch.setenv("LENGGUAHITA_STORIES_PERMISSION_ID", "test-permission-record")
    story_service.reset_story_cache()

    assert story_service.get_story_availability()["enabled"] is False
    assert story_service.get_available_stories(limit=1) == []

    story_service.reset_story_cache()
