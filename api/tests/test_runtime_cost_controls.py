import ast
import asyncio
from pathlib import Path

from api.models import HealthResponse


SOURCE_PATH = Path(__file__).resolve().parents[1] / "api" / "main.py"
SOURCE = SOURCE_PATH.read_text(encoding="utf-8")
MODULE = ast.parse(SOURCE)


def _function_node(name: str):
    return next(
        node
        for node in MODULE.body
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)) and node.name == name
    )


def _load_health_check():
    function_node = _function_node("health_check")
    isolated_module = ast.Module(body=[function_node], type_ignores=[])

    class DummyApp:
        @staticmethod
        def get(*args, **kwargs):
            def decorator(func):
                return func

            return decorator

    namespace = {
        "app": DummyApp(),
        "HealthResponse": HealthResponse,
    }
    exec(compile(isolated_module, str(SOURCE_PATH), "exec"), namespace)
    return namespace["health_check"]


def _load_progress_builders():
    isolated_module = ast.Module(
        body=[
            _function_node("_build_learning_recommended"),
            _function_node("_build_all_progress"),
        ],
        type_ignores=[],
    )
    beginner_path = [
        {"id": "greetings", "title": "Greetings"},
        {"id": "numbers", "title": "Numbers"},
    ]
    intermediate_path = [{"id": "verbs", "title": "Verbs"}]
    advanced_path = [{"id": "stories", "title": "Stories"}]
    namespace = {
        "BEGINNER_PATH": beginner_path,
        "INTERMEDIATE_PATH": intermediate_path,
        "ADVANCED_PATH": advanced_path,
        "ALL_TOPICS": beginner_path + intermediate_path + advanced_path,
    }
    exec(compile(isolated_module, str(SOURCE_PATH), "exec"), namespace)
    return (
        namespace["_build_learning_recommended"],
        namespace["_build_all_progress"],
    )


def test_render_health_check_is_process_only():
    health_check = _load_health_check()

    response = asyncio.run(health_check())

    assert response == HealthResponse(
        status="healthy",
        database="not_checked",
        chunks=None,
    )

    referenced_names = {
        node.id
        for node in ast.walk(_function_node("health_check"))
        if isinstance(node, ast.Name)
    }
    assert referenced_names.isdisjoint(
        {"rag", "RAG_ENABLED", "asyncio", "psycopg", "psycopg2"}
    )


def test_api_has_no_synthetic_database_keepalive():
    function_names = {
        node.name
        for node in MODULE.body
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))
    }

    assert "warmup_database" not in function_names
    assert "database_keepalive_loop" not in function_names

    startup_node = _function_node("startup_event")
    startup_calls = {
        node.func.attr
        for node in ast.walk(startup_node)
        if isinstance(node, ast.Call) and isinstance(node.func, ast.Attribute)
    }
    assert "create_task" not in startup_calls
    assert "run_in_executor" not in startup_calls


def test_homepage_uses_one_database_connection_and_one_progress_query():
    homepage_loader = _function_node("_fetch_homepage_data")
    connect_calls = [
        node
        for node in ast.walk(homepage_loader)
        if isinstance(node, ast.Call)
        and isinstance(node.func, ast.Attribute)
        and node.func.attr == "connect"
    ]
    assert len(connect_calls) == 1

    section_helpers = {
        "_fetch_streak_data",
        "_fetch_xp_data",
        "_fetch_quiz_stats",
        "_fetch_game_stats",
        "_fetch_weak_areas",
        "_fetch_sr_summary",
        "_fetch_learning_progress",
    }
    for helper_name in section_helpers:
        assert not any(
            isinstance(node, ast.Call)
            and isinstance(node.func, ast.Attribute)
            and node.func.attr == "connect"
            for node in ast.walk(_function_node(helper_name))
        )

    progress_source = ast.get_source_segment(
        SOURCE,
        _function_node("_fetch_learning_progress"),
    )
    assert progress_source.count("FROM user_topic_progress WHERE user_id") == 1


def test_homepage_reuses_progress_for_recommendation_and_summary():
    build_recommended, build_all_progress = _load_progress_builders()
    progress = {
        "greetings": {
            "topic_id": "greetings",
            "started_at": "2026-08-01T00:00:00",
            "completed_at": "2026-08-01T00:05:00",
            "best_quiz_score": 100,
            "flashcards_viewed": 10,
            "last_activity_at": "2026-08-01T00:05:00",
        },
        "numbers": {
            "topic_id": "numbers",
            "started_at": "2026-08-02T00:00:00",
            "completed_at": None,
            "best_quiz_score": None,
            "flashcards_viewed": 2,
            "last_activity_at": "2026-08-02T00:02:00",
        },
    }

    recommended = build_recommended(progress)
    all_progress = build_all_progress(progress)

    assert recommended["recommendation_type"] == "continue"
    assert recommended["topic"]["id"] == "numbers"
    assert recommended["completed_topics"] == 1
    assert all_progress["summary"]["total_completed"] == 1
    assert all_progress["topics"][1]["progress"] is progress["numbers"]


def test_render_capacity_is_intentionally_unchanged():
    render_config = SOURCE_PATH.parents[2] / "render.yaml"
    config = render_config.read_text(encoding="utf-8")

    assert "plan: standard" in config
    assert "gunicorn api.main:app -w 3" in config
    assert "healthCheckPath: /api/health" in config
