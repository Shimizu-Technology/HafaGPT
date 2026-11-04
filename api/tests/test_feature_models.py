"""Retiring-model regressions; fixture text is English or copied verbatim."""
import ast
import asyncio
import json
import logging
import os
import time
from pathlib import Path
from types import SimpleNamespace
from typing import Optional
from unittest.mock import Mock

import pytest
from fastapi import HTTPException

from api import provider_errors
from api.feature_generation import feature_json, strip_card_citations, strip_reply_citations

ROOT = Path(__file__).parents[1]


def runtime(monkeypatch, **settings):
    for key in ('FLASHCARD_MODEL', 'PRACTICE_MODEL'):
        monkeypatch.delenv(key, raising=False)
    monkeypatch.setenv('OPENROUTER_API_KEY', 'test-only')
    for key, value in settings.items():
        monkeypatch.setenv(key, value)
    tree = ast.parse((ROOT / 'api/chatbot_service.py').read_text())
    names = {'MODEL_CONFIG', 'FLASHCARD_MODEL', 'PRACTICE_MODEL', 'flashcard_llm', 'practice_llm', 'OPENROUTER_GEMINI_FLASH_MODEL_ID'}
    nodes = [n for n in tree.body if
             isinstance(n, ast.ClassDef) and n.name == 'ModelConfigurationError' or
             isinstance(n, ast.FunctionDef) and n.name == 'get_model_client' or
             isinstance(n, ast.Assign) and any(isinstance(t, ast.Name) and t.id in names or
                 isinstance(t, ast.Tuple) and any(getattr(x, 'id', '') in names for x in t.elts) for t in n.targets)]
    namespace = {'os': os, 'OpenAI': lambda **kwargs: SimpleNamespace(options=kwargs)}
    exec(compile(ast.Module(body=nodes, type_ignores=[]), 'runtime', 'exec'), namespace)
    return namespace


def test_defaults_and_independent_overrides(monkeypatch):
    ns = runtime(monkeypatch)
    assert ns['FLASHCARD_MODEL_ID'] == 'openai/gpt-6-luna'
    assert ns['PRACTICE_MODEL_ID'] == 'openai/gpt-6.1-terra'
    assert set(ns['MODEL_CONFIG']) == {'gpt-5.6-luna', 'gpt-6-luna', 'gpt-6.1-terra'}
    assert ns['flashcard_llm'].options['timeout'] == 45.0
    assert ns['flashcard_llm'].options['max_retries'] == 0
    ns = runtime(monkeypatch, FLASHCARD_MODEL='gpt-5.6-luna', PRACTICE_MODEL='gpt-6-luna')
    assert ns['FLASHCARD_MODEL_ID'] == 'openai/gpt-5.6-luna'
    assert ns['PRACTICE_MODEL_ID'] == 'openai/gpt-6-luna'


@pytest.mark.parametrize('setting', ['FLASHCARD_MODEL', 'PRACTICE_MODEL'])
@pytest.mark.parametrize('value', ['', 'typo', 'gpt-6-luna '])
def test_bad_feature_setting_fails_at_module_initialization(monkeypatch, setting, value):
    with pytest.raises(RuntimeError, match=setting):
        runtime(monkeypatch, **{setting: value})


@pytest.mark.parametrize('value,expected', [
    ("Håfa Adai! [Chamoru.info dictionary]", "Håfa Adai!"),
    ("Si Yu'os Ma'åse' [HåfaGPT vocabulary list]", "Si Yu'os Ma'åse'"),
    ('[Chamoru.info dictionary]', ''),
    ('a [optional] word [1, 2]', 'a [optional] word [1, 2]'),
    ('English [local source, Page 4]', 'English'),
    ('[brackets] and å', '[brackets] and å'),
    ('a word [dictionary form]', 'a word [dictionary form]'),
    ('a word [see dictionary]', 'a word [see dictionary]'),
    ('Håfa Adai (Chamoru.info dictionary)', 'Håfa Adai'),
    ('Håfa Adai [Chamoru.info dictionary; Revised Chamorro dictionary]', 'Håfa Adai'),
    ('Do you like it? (Do you really like this candy?)', 'Do you like it? (Do you really like this candy?)'),
])
def test_strip_only_source_citations_without_rewriting_words(value, expected):
    assert strip_card_citations(value, [{'name': 'local source'}]) == expected


def client(content=None, error=None):
    create = Mock(side_effect=error) if error else Mock(return_value=SimpleNamespace(
        choices=[SimpleNamespace(message=SimpleNamespace(content=content), finish_reason='stop')]))
    return SimpleNamespace(chat=SimpleNamespace(completions=SimpleNamespace(create=create)))


def test_feature_json_parameters_and_practice_empty_field():
    c = client('{"chamorro_response":"", "english_translation":"Try again"}')
    result = asyncio.run(feature_json(c, 'openai/gpt-6.1-terra', [], max_tokens=2000,
                                     source='conversation_practice', json_object=True))
    assert result['chamorro_response'] == ''
    kw = c.chat.completions.create.call_args.kwargs
    assert kw['response_format'] == {'type': 'json_object'}
    assert kw['extra_body'] == {'reasoning': {'effort': 'none'}}
    assert kw['max_tokens'] == 2000 and 'temperature' not in kw
    assert asyncio.run(feature_json(client('```json\n[]\n```'), 'model', [],
                                   max_tokens=6000, source='flashcards')) == []


@pytest.mark.parametrize('source,json_object', [('flashcards', False), ('conversation_practice', True)])
@pytest.mark.parametrize('failure', ['credit', 'timeout', 'malformed', 'empty', 'wrong_shape', 'unknown'])
def test_provider_failure_is_friendly_and_alerted(monkeypatch, source, json_object, failure):
    provider_errors.reset_alert_state()
    alert = Mock()
    monkeypatch.setattr(provider_errors, '_send_alert', alert)
    monkeypatch.setenv('PROVIDER_ALERT_BURST_THRESHOLD', '1')
    errors = {'credit': type('PaymentRequired', (Exception,), {'status_code': 402})('secret provider text'),
              'timeout': TimeoutError('secret provider text'), 'unknown': RuntimeError('secret provider text')}
    c = client({'malformed': 'not JSON', 'empty': '', 'wrong_shape': '[]' if json_object else '{}'}.get(failure), errors.get(failure))
    with pytest.raises(HTTPException) as raised:
        asyncio.run(feature_json(c, 'model', [], max_tokens=2000 if json_object else 6000,
                                 source=source, json_object=json_object))
    assert raised.value.status_code == 503
    assert raised.value.detail == provider_errors.PROVIDER_RETRY_MESSAGE
    alert.assert_called_once()
    assert 'secret' not in str(alert.call_args)


def endpoint(name, namespace):
    node = next(n for n in ast.parse((ROOT / 'api/main.py').read_text()).body
                if isinstance(n, ast.AsyncFunctionDef) and n.name == name)
    node.decorator_list = []
    exec(compile(ast.Module(body=[node], type_ignores=[]), 'main.py', 'exec'), namespace)
    return namespace[name]


def flashcard_endpoint(monkeypatch, c):
    from api.models import FlashcardResponse, GenerateFlashcardsResponse
    import sys
    import openai
    monkeypatch.setattr(openai, 'OpenAI', lambda **kwargs: c)
    monkeypatch.setenv('OPENAI_API_KEY', 'test-only')
    monkeypatch.setitem(sys.modules, 'src.rag.chamorro_rag', SimpleNamespace(rag=SimpleNamespace(
        create_context=lambda *a, **k: ('English reference text', [{'name': 'local source'}]))))
    async def auth(*a): return 'test-user'
    ns = dict(Form=lambda *a, **k: None, Header=lambda *a, **k: None, Optional=Optional, HTTPException=HTTPException,
              verify_user=auth, json=json, logger=logging.getLogger(__name__), time=time,
              asyncio=asyncio, os=os, flashcard_llm=c, FLASHCARD_MODEL_ID='openai/gpt-6-luna',
              feature_json=feature_json, strip_card_citations=strip_card_citations,
              FlashcardResponse=FlashcardResponse, GenerateFlashcardsResponse=GenerateFlashcardsResponse,
              report_if_provider_error=provider_errors.report_if_provider_error)
    return endpoint('generate_flashcards', ns)


def test_flashcard_endpoint_strips_before_dedupe_and_skips_empty_card(monkeypatch):
    c = client(json.dumps([
        {'front': '[local source]', 'back': 'Empty'},
        {'front': 'Word [local source]', 'back': 'Meaning [local source]', 'example': 'Text [optional]'},
        {'front': 'Word', 'back': 'Meaning'},
    ]))
    result = asyncio.run(flashcard_endpoint(monkeypatch, c)(topic='food', count=3, variety='basic', previous_cards='[]', authorization=None))
    assert result.count == 1
    assert result.flashcards[0].front == 'Word'
    assert result.flashcards[0].example == 'Text [optional]'
    kw = c.chat.completions.create.call_args.kwargs
    assert kw['model'] == 'openai/gpt-6-luna' and kw['max_tokens'] == 6000
    assert 'temperature' not in kw


def test_flashcard_endpoint_provider_failure(monkeypatch):
    c = client(error=TimeoutError('private provider text'))
    with pytest.raises(HTTPException) as raised:
        asyncio.run(flashcard_endpoint(monkeypatch, c)(topic='food', count=3, variety='basic', previous_cards='[]', authorization=None))
    assert raised.value.status_code == 503
    assert raised.value.detail == provider_errors.PROVIDER_RETRY_MESSAGE


async def _signed_in(_authorization):
    return 'practice-learner'


def practice_endpoint(monkeypatch, c, verify_user=None, rate_limit=None):
    import sys
    from pydantic import BaseModel, Field
    from typing import Any, Dict, List
    from api.conversation_practice_models import (
        ConversationPracticeRequest, GroundingStatus, build_conversation_system_prompt,
        grounding_status_from_sources,
    )
    monkeypatch.setitem(sys.modules, 'api.canonical_context', SimpleNamespace(
        get_canonical_tutor_context=lambda _: ('', [])))
    monkeypatch.setitem(sys.modules, 'api.tutor_intent', SimpleNamespace(
        curriculum_tutor_context=lambda *a: ('', [])))
    ns = dict(BaseModel=BaseModel, Field=Field, Any=Any, Dict=Dict, List=List,
              Optional=Optional, GroundingStatus=GroundingStatus,
              ConversationPracticeRequest=ConversationPracticeRequest,
              grounding_status_from_sources=grounding_status_from_sources,
              build_conversation_system_prompt=build_conversation_system_prompt,
              practice_llm=c, PRACTICE_MODEL_ID='openai/gpt-6.1-terra', feature_json=feature_json,
              strip_reply_citations=strip_reply_citations,
              HTTPException=HTTPException, logger=logging.getLogger(__name__),
              report_if_provider_error=provider_errors.report_if_provider_error,
              asyncio=asyncio, os=os, json=json, Header=lambda default=None: default,
              verify_user=verify_user or _signed_in, check_practice_rate_limit=rate_limit or (lambda _: True))
    tree = ast.parse((ROOT / 'api/main.py').read_text())
    response = next(n for n in tree.body if isinstance(n, ast.ClassDef) and n.name == 'ConversationPracticeResponse')
    exec(compile(ast.Module(body=[response], type_ignores=[]), 'main.py', 'exec'), ns)
    return endpoint('conversation_practice', ns)


@pytest.mark.parametrize('empty', [True, False])
def test_practice_endpoint_keeps_empty_chamorro_and_validates_evidence(monkeypatch, empty):
    from api.conversation_practice_models import ConversationPracticeRequest
    from test_conversation_practice_validation import valid_payload
    payload = valid_payload()
    payload['user_message'] = 'Hello'
    c = client(json.dumps({'chamorro_response': '' if empty else 'Håfa Adai',
                           'english_translation': 'Hello', 'objectives_completed': ['invented'],
                           'objective_evidence': [{'objective': 'invented', 'evidence': 'Hello'}],
                           'final_score': 5}))
    result = asyncio.run(practice_endpoint(monkeypatch, c)(ConversationPracticeRequest(**payload)))
    assert result.chamorro_response == ('' if empty else 'Håfa Adai')
    assert result.objectives_completed == [] and result.objective_evidence == []
    assert result.final_score is None
    assert c.chat.completions.create.call_args.kwargs['model'] == 'openai/gpt-6.1-terra'


def test_practice_endpoint_provider_failure(monkeypatch):
    from api.conversation_practice_models import ConversationPracticeRequest
    from test_conversation_practice_validation import valid_payload
    c = client(error=type('PaymentRequired', (Exception,), {'status_code': 402})('private credits'))
    with pytest.raises(HTTPException) as raised:
        asyncio.run(practice_endpoint(monkeypatch, c)(ConversationPracticeRequest(**valid_payload())))
    assert raised.value.status_code == 503
    assert raised.value.detail == provider_errors.PROVIDER_RETRY_MESSAGE


@pytest.mark.parametrize('fields', [
    {'chamorro_response': None}, {'english_translation': ['private provider text']},
    {'feedback': 'private provider text'}, {'is_complete': None},
])
def test_practice_malformed_fields_are_provider_failures(monkeypatch, fields, caplog):
    from api.conversation_practice_models import ConversationPracticeRequest
    from test_conversation_practice_validation import valid_payload
    c = client(json.dumps(fields))
    with pytest.raises(HTTPException) as raised:
        asyncio.run(practice_endpoint(monkeypatch, c)(ConversationPracticeRequest(**valid_payload())))
    assert raised.value.status_code == 503
    assert raised.value.detail == provider_errors.PROVIDER_RETRY_MESSAGE
    assert 'private provider text' not in caplog.text


def test_vision_capable_chat_path_is_unchanged_and_text_only_fallback_is_explicit(monkeypatch):
    ns = runtime(monkeypatch)
    tree = ast.parse((ROOT / 'api/chatbot_service.py').read_text())
    nodes = [n for n in tree.body if isinstance(n, ast.FunctionDef) and n.name in {
        'get_vision_client', 'get_client_for_request', 'model_supports_vision'}]
    sentinel = object()
    ns.update(CHAT_MODEL='gpt-5.6-luna', llm=sentinel, LLM_MODEL_ID='openai/gpt-5.6-luna',
              _vision_client=None, _vision_model_id=None)
    exec(compile(ast.Module(body=nodes, type_ignores=[]), 'runtime', 'exec'), ns)
    assert ns['get_client_for_request'](True) == (sentinel, 'openai/gpt-5.6-luna')
    ns['CHAT_MODEL'] = 'text-only-fixture'
    ns['MODEL_CONFIG']['text-only-fixture'] = {'supports_vision': False}
    assert ns['get_client_for_request'](True)[1] == 'openai/gpt-5.6-luna'
    monkeypatch.delenv('OPENROUTER_API_KEY')
    ns['_vision_client'] = None
    with pytest.raises(ns['ModelConfigurationError'], match='vision fallback'):
        ns['get_client_for_request'](True)


@pytest.mark.parametrize('failure', [False, True, 'empty'])
def test_summary_uses_luna_and_keeps_truncation_fallback(monkeypatch, failure):
    from src.utils import token_manager
    c = client('English summary' if failure != 'empty' else '', TimeoutError('private') if failure is True else None)
    monkeypatch.setenv('OPENROUTER_API_KEY', 'test-only')
    monkeypatch.setattr(token_manager, 'OpenAI', lambda **k: c)
    text = 'English history text. ' * 40
    summary = asyncio.run(token_manager.summarize_text(text, max_output_tokens=100))
    assert summary == (token_manager.truncate_text(text, 400) if failure else 'English summary')
    kw = c.chat.completions.create.call_args.kwargs
    assert kw['model'] == 'openai/gpt-6-luna'
    assert kw['extra_body'] == {'reasoning': {'effort': 'none'}} and 'temperature' not in kw


def test_practice_needs_an_account(monkeypatch):
    from api.conversation_practice_models import ConversationPracticeRequest
    from test_conversation_practice_validation import valid_payload

    async def rejected(_authorization):
        raise HTTPException(status_code=401, detail='Authentication required')

    c = client('{}')
    with pytest.raises(HTTPException) as caught:
        asyncio.run(practice_endpoint(monkeypatch, c, verify_user=rejected)(ConversationPracticeRequest(**valid_payload())))
    assert caught.value.status_code == 401
    c.chat.completions.create.assert_not_called()


def test_practice_stops_a_fast_account_before_spending(monkeypatch):
    from api.conversation_practice_models import ConversationPracticeRequest
    from test_conversation_practice_validation import valid_payload

    c = client('{}')
    with pytest.raises(HTTPException) as caught:
        asyncio.run(practice_endpoint(monkeypatch, c, rate_limit=lambda _: False)(ConversationPracticeRequest(**valid_payload())))
    assert caught.value.status_code == 429
    c.chat.completions.create.assert_not_called()


def test_a_null_category_falls_back_to_the_topic():
    source = (ROOT / 'api/main.py').read_text()
    assert 'category=card_data.get("category") or topic' in source


def _feature_reply(text):
    message = SimpleNamespace(content=text)
    create = Mock(return_value=SimpleNamespace(choices=[SimpleNamespace(message=message, finish_reason='stop')]))
    return SimpleNamespace(chat=SimpleNamespace(completions=SimpleNamespace(create=create)))


def _run_feature(text, *, json_object=False):
    return asyncio.run(feature_json(_feature_reply(text), 'model', [], max_tokens=10, source='test', json_object=json_object))


def test_a_json_fence_is_accepted_in_any_case():
    assert _run_feature('```JSON\n[{"front": "a"}]\n```') == [{'front': 'a'}]


def test_an_extra_card_property_does_not_lose_the_batch():
    assert _run_feature('[{"front": "a", "confidence": 0.9}]') == [{'front': 'a', 'confidence': 0.9}]


@pytest.mark.parametrize('body', ['{"english_translation": "Hi"}', '{"chamorro_response": "Håfa"}'])
def test_a_practice_reply_missing_a_text_field_is_a_failed_turn(monkeypatch, body):
    monkeypatch.setattr(provider_errors, 'report_provider_failure', lambda *a, **k: SimpleNamespace(message='retry'))
    from api import feature_generation
    monkeypatch.setattr(feature_generation, 'report_provider_failure', lambda *a, **k: SimpleNamespace(message='retry'))
    with pytest.raises(HTTPException) as caught:
        _run_feature(body, json_object=True)
    assert caught.value.status_code == 503


def test_an_empty_chamorro_practice_reply_stays_valid():
    assert _run_feature('{"chamorro_response": "", "english_translation": "Hi"}', json_object=True)['chamorro_response'] == ''


def test_a_practice_reply_shows_no_source_labels(monkeypatch):
    from api.conversation_practice_models import ConversationPracticeRequest
    from test_conversation_practice_validation import valid_payload

    c = client(json.dumps({
        'chamorro_response': "Si Yu'os Ma'åse' [HåfaGPT vocabulary list]",
        'english_translation': 'Hello! How are you? [HåfaGPT vocabulary list]',
        'feedback': {'message': 'You greeted me with Håfa Adai [HåfaGPT vocabulary list].', 'corrections': ['Try [a phrase] (Chamoru.info dictionary)']},
    }))
    result = asyncio.run(practice_endpoint(monkeypatch, c)(ConversationPracticeRequest(**valid_payload())))
    assert result.chamorro_response == "Si Yu'os Ma'åse'"
    assert result.english_translation == 'Hello! How are you?'
    assert 'vocabulary list' not in json.dumps(result.feedback, ensure_ascii=False)
    assert result.feedback['corrections'] == ['Try [a phrase]']

