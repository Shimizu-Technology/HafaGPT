import ast
from pathlib import Path


SOURCE_PATH = Path(__file__).resolve().parents[1] / "api" / "chatbot_service.py"
SOURCE = SOURCE_PATH.read_text(encoding="utf-8")
MODULE = ast.parse(SOURCE)


def _assignment_node(name: str):
    return next(
        node
        for node in MODULE.body
        if isinstance(node, ast.Assign)
        and any(
            isinstance(target, ast.Name) and target.id == name
            for target in node.targets
        )
    )


def _load_error_classifiers():
    isolated_module = ast.Module(
        body=[
            _assignment_node("CONTEXT_LENGTH_ERROR_PATTERNS"),
            _assignment_node("PROVIDER_CREDIT_ERROR_PATTERNS"),
            _function_node("_is_context_length_error"),
            _function_node("_is_provider_credit_error"),
        ],
        type_ignores=[],
    )
    namespace = {}
    exec(compile(isolated_module, str(SOURCE_PATH), "exec"), namespace)
    return namespace["_is_context_length_error"], namespace["_is_provider_credit_error"]


def _function_node(name: str):
    return next(
        node
        for node in MODULE.body
        if isinstance(node, ast.FunctionDef) and node.name == name
    )


def test_openrouter_credit_error_is_not_misclassified_as_context_overflow():
    is_context_length_error, is_provider_credit_error = _load_error_classifiers()
    error = RuntimeError(
        "402 Payment Required: requested max_tokens exceeds the openrouter_credits balance"
    )

    assert is_provider_credit_error(error)
    assert not is_context_length_error(error)


def test_status_code_402_is_a_provider_credit_error():
    _, is_provider_credit_error = _load_error_classifiers()
    error = RuntimeError("upstream request failed")
    error.status_code = 402

    assert is_provider_credit_error(error)


def test_context_window_error_remains_distinct():
    is_context_length_error, is_provider_credit_error = _load_error_classifiers()
    error = RuntimeError("context_length_exceeded: maximum context window reached")

    assert is_context_length_error(error)
    assert not is_provider_credit_error(error)


def test_chat_requests_cap_output_to_the_reserved_response_budget():
    for function_name in ("get_chatbot_response", "get_chatbot_response_stream"):
        completion_calls = [
            node
            for node in ast.walk(_function_node(function_name))
            if isinstance(node, ast.Call)
            and isinstance(node.func, ast.Attribute)
            and node.func.attr == "create"
            and isinstance(node.func.value, ast.Attribute)
            and node.func.value.attr == "completions"
        ]

        assert completion_calls
        for call in completion_calls:
            max_tokens = next(
                keyword.value for keyword in call.keywords if keyword.arg == "max_tokens"
            )
            assert ast.unparse(max_tokens) == "token_manager.budget.response_buffer"
