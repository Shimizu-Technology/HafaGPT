import ast
from pathlib import Path


def _load_image_helpers():
    source_path = Path(__file__).resolve().parents[1] / "api" / "chatbot_service.py"
    module = ast.parse(source_path.read_text())
    helper_nodes = [
        node
        for node in module.body
        if isinstance(node, ast.FunctionDef)
        and node.name in {"_normalize_image_inputs", "_build_current_user_message"}
    ]
    isolated_module = ast.Module(body=helper_nodes, type_ignores=[])
    namespace = {}
    exec(compile(isolated_module, str(source_path), "exec"), namespace)
    return namespace["_normalize_image_inputs"], namespace["_build_current_user_message"]


def test_build_current_user_message_includes_all_images_with_content_types():
    _, build_message = _load_image_helpers()

    message = build_message(
        "Compare these screenshots",
        [
            {"data": "first-image", "content_type": "image/png"},
            {"data": "second-image", "content_type": "image/webp"},
        ],
    )

    assert message["role"] == "user"
    assert message["content"][0] == {
        "type": "text",
        "text": "Compare these screenshots",
    }
    assert message["content"][1]["image_url"]["url"] == "data:image/png;base64,first-image"
    assert message["content"][2]["image_url"]["url"] == "data:image/webp;base64,second-image"
    assert all(part["image_url"]["detail"] == "low" for part in message["content"][1:])


def test_normalize_image_inputs_preserves_legacy_single_image():
    normalize, _ = _load_image_helpers()

    assert normalize(image_base64="legacy-image", image_inputs=None) == [{
        "data": "legacy-image",
        "content_type": "image/jpeg",
    }]
