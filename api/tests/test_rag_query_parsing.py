import ast
from pathlib import Path


def _load_extract_target_word():
    source_path = Path(__file__).resolve().parents[1] / "src" / "rag" / "chamorro_rag.py"
    module = ast.parse(source_path.read_text(encoding="utf-8"))
    function_node = next(
        node
        for node in module.body
        if isinstance(node, ast.FunctionDef) and node.name == "extract_target_word"
    )
    namespace = {}
    exec(
        compile(ast.Module(body=[function_node], type_ignores=[]), str(source_path), "exec"),
        namespace,
    )
    return namespace["extract_target_word"]


def test_extract_target_word_accepts_straight_and_typographic_quotes():
    extract_target_word = _load_extract_target_word()

    assert extract_target_word('What does "taigue" mean?') == "taigue"
    assert extract_target_word('What does “taigue” mean?') == "taigue"
    assert extract_target_word("What does ‘taigue’ mean?") == "taigue"


def test_extract_target_word_preserves_internal_apostrophes():
    extract_target_word = _load_extract_target_word()

    assert extract_target_word("What does 'ga'lågu' mean?") == "ga'lågu"
