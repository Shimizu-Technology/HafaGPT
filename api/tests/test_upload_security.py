import ast
import io
import re
import zipfile
from pathlib import Path

import pytest


def _load_helpers():
    source_path = Path(__file__).resolve().parents[1] / "api" / "main.py"
    module = ast.parse(source_path.read_text())
    wanted = {
        "safe_upload_filename",
        "validate_uploaded_file_signature",
    }
    nodes = [
        node
        for node in module.body
        if isinstance(node, ast.FunctionDef) and node.name in wanted
    ]
    namespace = {
        "Path": Path,
        "SUPPORTED_FILE_TYPES": {
            "application/pdf": "pdf",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
            "application/msword": "doc",
            "text/plain": "txt",
            "image/jpeg": "image",
            "image/png": "image",
            "image/webp": "image",
            "image/gif": "image",
        },
        "io": io,
        "MAX_DOCX_ARCHIVE_ENTRIES": 2000,
        "MAX_DOCX_UNCOMPRESSED_BYTES": 1024,
        "re": re,
        "zipfile": zipfile,
    }
    exec(compile(ast.Module(body=nodes, type_ignores=[]), str(source_path), "exec"), namespace)
    return namespace


def _docx_bytes() -> bytes:
    result = io.BytesIO()
    with zipfile.ZipFile(result, "w") as archive:
        archive.writestr("[Content_Types].xml", "<Types />")
        archive.writestr("word/document.xml", "<document />")
    return result.getvalue()


@pytest.mark.parametrize(
    ("payload", "content_type", "filename"),
    [
        (b"%PDF-1.7\n", "application/pdf", "lesson.pdf"),
        (b"\x89PNG\r\n\x1a\nrest", "image/png", "photo.png"),
        (b"hello, familia", "text/plain", "notes.txt"),
        (_docx_bytes(), "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "homework.docx"),
    ],
)
def test_allows_matching_file_signatures(payload, content_type, filename):
    validate = _load_helpers()["validate_uploaded_file_signature"]
    validate(payload, content_type, filename)


def test_rejects_spoofed_content_type():
    validate = _load_helpers()["validate_uploaded_file_signature"]
    with pytest.raises(ValueError, match="does not match"):
        validate(b"not really a png", "image/png", "unsafe.png")


def test_rejects_binary_payload_claiming_to_be_text():
    validate = _load_helpers()["validate_uploaded_file_signature"]
    with pytest.raises(ValueError, match="does not match"):
        validate(b"hello\x00world", "text/plain", "unsafe.txt")


def test_rejects_docx_with_excessive_uncompressed_size():
    result = io.BytesIO()
    with zipfile.ZipFile(result, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        archive.writestr("[Content_Types].xml", "<Types />")
        archive.writestr("word/document.xml", "A" * 2048)

    validate = _load_helpers()["validate_uploaded_file_signature"]
    with pytest.raises(ValueError, match="does not match"):
        validate(
            result.getvalue(),
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "oversized.docx",
        )


def test_sanitizes_upload_filename():
    sanitize = _load_helpers()["safe_upload_filename"]
    assert sanitize("../../family notes <final>.pdf") == "family_notes_final_.pdf"
