"""The edit revision a client receives must match the one regeneration checks.

``get_conversation_messages`` hashes its rows into ``edit_revision`` and
``get_regeneration_snapshot`` hashes ``_owned_regeneration_rows``. Both hash
whole rows, so the two SELECT projections must list the same columns in the
same order; otherwise every edit is rejected as a conflict. SQL mocks return
fixture rows regardless of projection, so this compares the SQL itself.
"""

import ast
import re
from pathlib import Path

SOURCE = Path(__file__).resolve().parents[1] / "api" / "conversations.py"


def _select_columns(function_name: str, table_marker: str) -> list[str]:
    module = ast.parse(SOURCE.read_text())
    function = next(
        node for node in module.body
        if isinstance(node, ast.FunctionDef) and node.name == function_name
    )
    for node in ast.walk(function):
        if isinstance(node, ast.Constant) and isinstance(node.value, str) and table_marker in node.value:
            match = re.search(r"SELECT\s+(.*?)\s+FROM\s", node.value, re.S | re.I)
            if match:
                columns = [column.strip() for column in match.group(1).split(",")]
                return [column.split(".", 1)[-1] for column in columns]
    raise AssertionError(f"No SELECT over {table_marker} found in {function_name}")


def test_message_list_and_regeneration_snapshot_hash_the_same_columns():
    listed = _select_columns("get_conversation_messages", "FROM conversation_logs")
    snapshot = _select_columns("_owned_regeneration_rows", "JOIN conversation_logs")

    assert listed == snapshot


def test_revision_projection_includes_the_tutor_task():
    assert "tutor_intent" in _select_columns("get_conversation_messages", "FROM conversation_logs")
