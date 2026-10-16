"""Exercise both page adapters without importing provider/database singletons."""

import ast
import json
import time
from collections.abc import Iterator
from pathlib import Path
from types import SimpleNamespace
from typing import Any
from unittest.mock import Mock

import pytest

from api.image_translation import translate_image_pages
from api.image_translation_legacy import translate_image_pages as translate_image_pages_legacy
from src.rag.image_translation_context import ImagePageContext, ImageTextItem, ImageTranslationContext


@pytest.mark.parametrize('streaming_enabled', [False, True])
@pytest.mark.parametrize('mode', ['english', 'chamorro'])
def test_page_adapter_selects_opt_in_route_and_preserves_established_mode_guidance(streaming_enabled, mode):
    item = ImageTextItem('p1-i1', 'Printed source')
    context = ImageTranslationContext(pages=(ImagePageContext(0, (item,), 'high', True),))
    calls = []

    def complete(**kwargs):
        calls.append(kwargs)
        if kwargs.get('stream'):
            return iter([
                SimpleNamespace(choices=[SimpleNamespace(delta=SimpleNamespace(content='A page.\n[[p1-i1]] Printed source >> Interpreted text\n'), finish_reason=None)]),
                SimpleNamespace(choices=[SimpleNamespace(delta=SimpleNamespace(content=None), finish_reason='stop')]),
            ])
        return SimpleNamespace(choices=[SimpleNamespace(finish_reason='stop', message=SimpleNamespace(content=json.dumps({
            'translations': [{'id': item.id, 'translation': 'Interpreted text', 'uncertain': False}], 'notes': '',
        })))])

    source = Path(__file__).resolve().parents[1] / 'api' / 'chatbot_service.py'
    node = next(node for node in ast.parse(source.read_text()).body
                if isinstance(node, ast.FunctionDef) and node.name == '_image_translation_events')
    stream_route = Mock(wraps=translate_image_pages)
    established_route = Mock(wraps=translate_image_pages_legacy)
    namespace = {
        'ImageTranslationContext': ImageTranslationContext, 'Iterator': Iterator, 'Any': Any, 'time': time,
        'get_client_for_request': lambda **kwargs: (SimpleNamespace(chat=SimpleNamespace(completions=SimpleNamespace(create=complete))), 'fake'),
        'build_image_translation_query': lambda message, context: (message, True),
        'resolve_school_message_context': lambda *args, **kwargs: ('SCHOOL GUIDANCE', True, []),
        'MODE_PROMPTS': {'english': {'prompt': 'ENGLISH MODE'}, 'chamorro': {'prompt': 'CHAMORRO MODE'}},
        'SKILL_LEVEL_MODIFIERS': {'beginner': 'BEGINNER GUIDANCE'},
        'tutor_task_guidance': lambda intent: 'TASK GUIDANCE',
        'build_translation_structure_hints': lambda message: 'CONTENT HINT',
        'translate_image_pages': stream_route, 'translate_image_pages_legacy': established_route,
        'get_rag_context': lambda *args, **kwargs: ('', []),
        'format_source_citations': lambda sources: sources, 'optional_chat_completion_kwargs': lambda model: {},
        'is_message_cancelled': lambda pending: False,
        'log_conversation': Mock(), 'cleanup_cancelled_message': Mock(),
        '_extract_stream_chunk_content_and_empty_choice': lambda chunk: (chunk.choices[0].delta.content or '', False),
        'transcription_image_detail': lambda model: 'original',
        'photo_translation_streaming_enabled': lambda: streaming_enabled,
    }
    exec(compile(ast.Module(body=[node], type_ignores=[]), str(source), 'exec'), namespace)
    events = list(namespace['_image_translation_events'](
        image_context=context, images=[{'data': 'image', 'content_type': 'image/png'}],
        message='Translate this.', message_for_logging='Translate this.', mode=mode,
        session_id=None, user_id=None, conversation_id=None, image_url=None, file_urls=None,
        pending_id=None, start_time=time.time(), past_messages=[], skill_level='beginner', persist=False,
    ))
    assert events[-1]['complete'] is True
    assert 'Interpreted text' in ''.join(event.get('content', '') for event in events if event['type'] == 'chunk')
    namespace['log_conversation'].assert_not_called()
    if streaming_enabled:
        stream_route.assert_called_once()
        established_route.assert_not_called()
        assert len(calls) == 1 and calls[0]['stream'] is True
        assert stream_route.call_args.kwargs['guidance'] == 'CONTENT HINT'
        assert stream_route.call_args.kwargs['school_announcement'] is True
        assert stream_route.call_args.kwargs['image_detail'] == 'original'
        if mode == 'chamorro':
            assert 'Chamorro only' in stream_route.call_args.kwargs['target']
    else:
        established_route.assert_called_once()
        stream_route.assert_not_called()
        assert len(calls) == 2 and all('stream' not in call for call in calls)
        prompt = calls[0]['messages'][0]['content']
        assert f'{mode.upper()} MODE' in prompt
        assert 'SCHOOL GUIDANCE' in prompt and 'TASK GUIDANCE' in prompt and 'CONTENT HINT' in prompt
        assert ('BEGINNER GUIDANCE' in prompt) is (mode == 'english')
        if mode == 'chamorro':
            assert 'Write every translation and notes value in Chamorro only.' in prompt
        assert calls[0]['messages'][1]['content'][1]['image_url']['detail'] == 'high'
