"""Bridge background chat events to an SSE response without long idle gaps."""

import asyncio
import json
import logging
import queue
import threading
import time
from collections.abc import AsyncIterator

logger = logging.getLogger(__name__)
SSE_KEEPALIVE_SECONDS = 15.0


async def queue_sse_events(
    event_queue: queue.Queue,
    stream_done: threading.Event,
) -> AsyncIterator[str]:
    """Send comments during provider waits; drain queued events before [DONE].

    Comments are transport heartbeats, not model text or completion events. The
    producer owns its lifetime; closing this iterator does not cancel a response
    that the application deliberately continues saving in the background.
    """
    yield ": keep-alive\n\n"
    last_sent = time.monotonic()
    while True:
        try:
            event = event_queue.get_nowait()
            yield f"data: {json.dumps(event)}\n\n"
            last_sent = time.monotonic()
        except queue.Empty:
            if stream_done.is_set() and event_queue.empty():
                yield "data: [DONE]\n\n"
                return
            if time.monotonic() - last_sent >= SSE_KEEPALIVE_SECONDS:
                yield ": keep-alive\n\n"
                last_sent = time.monotonic()
            await asyncio.sleep(0.01)
        except Exception as error:
            logger.error("SSE error: %s", error)
            yield f"data: {json.dumps({'type': 'error', 'content': str(error)})}\n\n"
            return
