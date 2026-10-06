"""Generate edits without deleting or exposing an incomplete persisted replacement."""

from collections.abc import Callable, Iterator
from typing import Any

from .conversations import RegenerationCancelled, RegenerationConflict


def atomic_regeneration_events(
    generate: Callable[[], Iterator[dict[str, Any]]],
    upload: Callable[[], list[dict[str, Any]]],
    replace: Callable[[str, dict[str, Any], list[dict[str, Any]]], int],
    cancelled: Callable[[], bool],
) -> Iterator[dict[str, Any]]:
    """Emit success only after complete generation, storage and atomic replacement."""
    text = []
    metadata: dict[str, Any] = {"sources": [], "used_rag": False, "used_web_search": False}
    completion = None
    events = None
    try:
        if cancelled():
            raise RegenerationCancelled()
        events = generate()
        for event in events:
            if cancelled():
                yield {"type": "cancelled", "content": "[Message was cancelled by user]"}
                return
            event_type = event.get("type")
            if event_type == "done":
                completion = event
            elif event_type in ("error", "cancelled"):
                yield event
                return
            else:
                if event_type == "chunk":
                    text.append(event.get("content", ""))
                elif event_type == "metadata":
                    metadata = event
                yield event
        if cancelled():
            raise RegenerationCancelled()
        if not completion or completion.get("complete") is not True or not "".join(text).strip():
            yield {"type": "error", "content": "The edited reply did not complete. Your saved conversation is unchanged."}
            return
        files = upload()
        if cancelled():
            raise RegenerationCancelled()
        details = {**metadata, "response_time": completion.get("response_time", 0)}
        message_id = replace("".join(text), details, files)
        yield {**completion, "type": "done", "message_id": message_id, "edit_protocol": "atomic-v1"}
    except RegenerationCancelled:
        yield {"type": "cancelled", "content": "[Message was cancelled by user]"}
    except RegenerationConflict:
        yield {"type": "error", "content": "This conversation changed. Reopen it before editing. Your saved conversation is unchanged."}
    except Exception:
        yield {"type": "error", "content": "Could not update this message. Your saved conversation is unchanged. Please try again."}
    finally:
        close = getattr(events, "close", None)
        if close:
            close()
