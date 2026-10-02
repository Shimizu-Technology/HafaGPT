"""Exercise the actual async transport with a virtual clock, without model calls."""

import asyncio
import json
import queue
import threading
from unittest.mock import patch

from api.sse import queue_sse_events


def test_long_provider_wait_keeps_stream_alive_and_preserves_terminal_events():
    events = queue.Queue()
    done = threading.Event()
    clock = [0.0]
    wire = []

    async def tick(_delay):
        clock[0] += 1.0
        if clock[0] == 306.0:
            events.put({'type': 'chunk', 'content': 'Complete translation'})
            events.put({'type': 'done', 'response_time': 306.0})
            done.set()

    async def consume():
        async for frame in queue_sse_events(events, done):
            wire.append((clock[0], frame))

    with patch('api.sse.time.monotonic', side_effect=lambda: clock[0]), patch('api.sse.asyncio.sleep', tick):
        asyncio.run(consume())

    heartbeats = [(at, frame) for at, frame in wire if frame.startswith(':')]
    assert [at for at, _ in heartbeats] == list(range(0, 301, 15))
    assert all(frame == ': keep-alive\n\n' for _, frame in heartbeats)
    data = [frame for _, frame in wire if frame.startswith('data:')]
    assert json.loads(data[0][6:]) == {'type': 'chunk', 'content': 'Complete translation'}
    assert json.loads(data[1][6:]) == {'type': 'done', 'response_time': 306.0}
    assert data[2:] == ['data: [DONE]\n\n']


def test_model_traffic_resets_idle_timer_and_queued_error_precedes_done():
    events = queue.Queue()
    done = threading.Event()
    clock = [0.0]
    wire = []

    async def tick(_delay):
        clock[0] += 1.0
        if clock[0] == 10.0:
            events.put({'type': 'chunk', 'content': 'First page'})
        if clock[0] == 31.0:
            events.put({'type': 'error', 'content': 'Provider unavailable'})
            done.set()

    async def consume():
        async for frame in queue_sse_events(events, done):
            wire.append((clock[0], frame))

    with patch('api.sse.time.monotonic', side_effect=lambda: clock[0]), patch('api.sse.asyncio.sleep', tick):
        asyncio.run(consume())

    assert [at for at, frame in wire if frame.startswith(':')] == [0, 25]
    assert json.loads(wire[-2][1][6:])['type'] == 'error'
    assert wire[-1][1] == 'data: [DONE]\n\n'


def test_disconnected_consumer_closes_without_marking_background_producer_done():
    events = queue.Queue()
    done = threading.Event()

    async def consume_then_close():
        stream = queue_sse_events(events, done)
        assert await anext(stream) == ': keep-alive\n\n'
        await stream.aclose()
        assert not done.is_set()
        # A background response can still be generated/persisted after disconnect.
        events.put({'type': 'chunk', 'content': 'Background result'})
        assert events.qsize() == 1

    asyncio.run(consume_then_close())
