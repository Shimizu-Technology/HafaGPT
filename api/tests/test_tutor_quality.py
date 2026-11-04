"""Offline acceptance tests for the production-path evaluation adapter."""
import ast
from contextlib import contextmanager
import csv
import json
from pathlib import Path
import re
import socket
import sys
from types import SimpleNamespace, ModuleType
from unittest.mock import Mock

import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from evaluation import run_tutor_quality as tq


@pytest.fixture(autouse=True)
def no_network(monkeypatch):
    def forbidden(*a, **k):
        raise AssertionError('Network is forbidden in harness tests')
    monkeypatch.setattr(socket.socket, 'connect', forbidden)
    import psycopg
    monkeypatch.setattr(psycopg, 'connect', forbidden)
    try:
        import psycopg2
        monkeypatch.setattr(psycopg2, 'connect', forbidden)
    except ImportError:
        pass


def test_suite_attestations_and_coverage():
    v1 = tq.load_cases(tq.DEFAULT_CASES.with_name('tutor_quality_v1.json'))
    assert len(v1) == len({c['id'] for c in v1}) == 150
    assert {c['category'] for c in v1} == {'production', 'dictionary_lookup', 'phrasing_variant', 'verification', 'school_message', 'communicative_goal', 'absent_word', 'grammar'}
    cases = tq.load_cases()
    assert tq.suite_id(tq.DEFAULT_CASES) == 'tutor_quality_v2'
    assert len(cases) == len({c['id'] for c in cases}) == 168
    # Source-supported polysemy (will/gånas, free/franko, may/Måyu) is measured in context.
    assert {c['id'] for c in cases if c['category'] == 'polysemy'} == {'tq2-015', 'tq2-016', 'tq2-017', 'tq2-018'}
    # v2 keeps every v1 case byte-for-byte, so the tq1 subset stays comparable.
    assert cases[:150] == v1
    assert all(c['id'].startswith('tq2-') for c in cases[150:])
    assert "You're sure about all of these words for this sentence?" in {c['user_message'] for c in cases}
    assert sum(bool(c['history']) for c in cases) >= 15
    serialized = json.dumps(cases, ensure_ascii=False)
    assert not re.search(r'[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}', serialized)
    assert not re.search(r'\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b', serialized, re.I)
    assert 'My manager and my coworker' in serialized



def test_changed_source_headword_fails_validation(tmp_path):
    suite = json.loads(tq.DEFAULT_CASES.read_text())
    suite['cases'][0]['expected_retrieved_headwords'][0]['any_of'][0]['headword'] = 'invented headword'
    path = tmp_path / 'cases.json'
    path.write_text(json.dumps(suite))
    with pytest.raises(ValueError, match='bytes changed'):
        tq.load_cases(path)


def test_headword_boundaries_and_accents():
    assert tq.headword_present("aga'", "Headword: aga'\nBanana")
    assert not tq.headword_present("aga'", "maga'låhi")
    assert not tq.headword_present('håyu', 'hayu')
    assert tq.headword_present('asut', 'ASUT = blue')


def test_checks_do_not_call_uncertainty_itself_a_verified_claim():
    case = tq.load_cases()[0]
    assert 'verified_without_citation' not in tq.score(case, 'This is not verified.', '')['must_not_violations']
    assert 'verified_without_citation' in tq.score(case, 'This is verified.', '')['must_not_violations']
    assert 'verified_without_citation' not in tq.score(case, 'This is verified [dictionary].', '')['must_not_violations']
    assert 'send_in_english' in tq.score(case, 'You should send it in English.', '')['must_not_violations']
    assert tq.score(case, None, 'tronkon håyu')['must_not_violations'] is None
    refusal = tq.score(case, 'I couldn’t find a verified dictionary entry for tree.', '')
    assert refusal['refusal']
    assert not refusal['must_not_violations']
    assert tq.score(case, 'I **can’t verify** this entry.', '')['refusal']


def test_missing_words_require_scoped_uncertainty():
    case = next(c for c in tq.load_cases() if c['category'] == 'absent_word')
    assert tq.score(case, 'I cannot verify this word in the local dictionaries.', '')['expected_behavior_signal']
    assert 'invented_absent_headword' in tq.score(case, 'The word is definitely X.', '')['must_not_violations']
    assert 'invented_absent_headword' not in tq.score(case, 'I couldn’t verify this word.', '')['must_not_violations']


def test_summary_excludes_errors_and_blocked_cache_from_quality_denominators():
    case = tq.load_cases()[0]
    good = dict(tq.score(case, 'A supported answer [dictionary].', 'tronkon håyu'), id='case-1', category=case['category'], expected_behavior='answer', router='none', expected_router='single_word_lookup', latency_s=1, error=None)
    blocked = dict(good, embedding_cache_misses=1)
    error = dict(good, error='provider_failed')
    summary = tq.summarize([good, blocked, error], {})
    assert summary['completed_cases'] == summary['answerable_responses'] == 1
    assert summary['expected_headword_total'] == 1
    assert summary['router_misclassifications'] == 3
    assert summary['embedding_blocked_cases'] == summary['errors'] == 1
    assert tq.percentile([1, 2, 3, 4], .95) == 4


def test_free_embedding_cache_never_calls_provider(tmp_path):
    cache = tq.EmbeddingCache(tmp_path / 'cache.json', True)
    provider = Mock(side_effect=AssertionError('Paid embedding invoked'))
    instance = SimpleNamespace(model='test', dimensions=384)
    with pytest.raises(RuntimeError, match='not cached'):
        cache.wrap(provider)(instance, 'tree')
    provider.assert_not_called()
    cache.values[tq.digest(json.dumps(['test', 384, 'tree'], ensure_ascii=False))] = [1., 0.]
    assert cache.wrap(provider)(instance, 'tree') == [1., 0.]
    provider.assert_not_called()


def test_budget_refuses_before_completion(monkeypatch):
    from src.utils import token_manager
    monkeypatch.setattr(token_manager, 'count_message_tokens', lambda _: 100)
    provider = Mock()
    capture = tq.CompletionCapture(provider, False, (.01, .01), 1.)
    with pytest.raises(RuntimeError, match='budget exhausted'):
        capture.create(messages=[{'role': 'system', 'content': 's'}], max_tokens=100)
    provider.assert_not_called()
    assert capture.current['error'] == 'budget_exhausted'


def test_readonly_guard_disables_pgvector_setup_and_verifies_connections(monkeypatch):
    import psycopg
    from langchain_postgres import PGVector
    from sqlalchemy import event
    from sqlalchemy.engine import Engine
    cursor = Mock()
    cursor.__enter__ = Mock(return_value=cursor)
    cursor.__exit__ = Mock(return_value=False)
    cursor.fetchone.return_value = ('on',)
    conn = Mock()
    conn.cursor.return_value = cursor
    original = Mock(return_value=conn)
    monkeypatch.setattr(psycopg, 'connect', original)
    with tq.readonly_database() as audit:
        psycopg.connect('postgresql://localhost/chamorro_rag', options='-c statement_timeout=1')
        assert original.call_args.kwargs['options'].endswith('-c default_transaction_read_only=on')
        assert audit['read_only_verified'] == 1
        if 'psycopg2' in audit['drivers_protected']:
            import psycopg2
            # Replace the forbidden default with a fake before entering a new guard.
            monkeypatch.setattr(psycopg2, 'connect', original)
            with tq.readonly_database() as nested_audit:
                psycopg2.connect('postgresql://localhost/chamorro_rag')
                assert nested_audit['read_only_verified'] == 1
                assert original.call_args.kwargs['options'].endswith('-c default_transaction_read_only=on')
        # No instance/engine is needed to exercise the setup methods: they are disabled.
        assert PGVector.create_collection(None) is None
        assert PGVector.create_tables_if_not_exists(None) is None
        assert PGVector.create_vector_extension(None) is None
        engine = __import__('sqlalchemy').create_engine('postgresql+psycopg://localhost/chamorro_rag')
        with pytest.raises(RuntimeError, match='non-read SQL'):
            engine.dispatch.before_cursor_execute(None, None, 'INSERT INTO users VALUES (1)', (), None, False)
        assert audit['blocked_statements'] == 1
        engine.dispose()


def test_blind_packet_is_compatible_and_key_is_separate(tmp_path):
    from evaluation.validate_blind_reviews import RATING_COLUMNS, validate_independent_reviews
    raw = tmp_path / 'cases.jsonl'
    base = {'id': 'case-1', 'category': 'production', 'history': [], 'user_message': 'hello', 'response': 'answer', 'model': 'model-A'}
    raw.write_text('\n'.join(json.dumps(dict(base, model=m, response=m+' response')) for m in ['model-A', 'model-B']))
    tq.export_packet([raw], tmp_path, 11)
    packet = list(csv.DictReader((tmp_path / 'blind_human_review.csv').open()))
    assert len({r['response_label'] for r in packet}) == 2
    assert all('model_alias' not in r for r in packet)
    assert len(json.loads((tmp_path / 'blind_review_key.json').read_text())) == 2
    paths = []
    for reviewer in ['first', 'second']:
        path = tmp_path / (reviewer+'.csv')
        rows = []
        for row in packet:
            rows.append(dict(row, reviewer_id=reviewer, reviewed_at='2026-11-03', regional_expertise='Guam', conflict_of_interest_yes_no='no', critical_error_yes_no='no', **{k:'4' for k in RATING_COLUMNS}))
        with path.open('w') as handle:
            writer = csv.DictWriter(handle, fieldnames=list(rows[0]))
            writer.writeheader()
            writer.writerows(rows)
        paths.append(path)
    assert validate_independent_reviews(paths) == ('first', 'second', 2)


def test_real_production_function_uses_fixture_history_and_never_persists(tmp_path, monkeypatch):
    """Execute the ACTUAL function body, with fake retrieval/provider boundaries.

    This catches adapter regressions that accidentally invoke real history/log
    DB helpers while keeping this test entirely offline.
    """
    import psycopg
    from src.utils import token_manager
    monkeypatch.setattr(token_manager, 'count_message_tokens', lambda _: 20)
    monkeypatch.setenv('DATABASE_URL', 'postgresql://localhost/chamorro_rag')
    monkeypatch.setenv('CHAT_MODEL', 'test-model')
    connection = Mock()
    connection.__enter__ = Mock(return_value=connection)
    connection.__exit__ = Mock(return_value=False)
    monkeypatch.setattr(psycopg, 'connect', Mock(return_value=connection))
    @contextmanager
    def readonly():
        yield {'connections': 1, 'read_only_verified': 1, 'blocked_statements': 0}
    monkeypatch.setattr(tq, 'readonly_database', readonly)
    fake_rag_module = ModuleType('src.rag.chamorro_rag')
    fake_rag_module.ResponsiveOpenAIEmbeddings = type('ResponsiveOpenAIEmbeddings', (), {'embed_query': Mock()})
    monkeypatch.setitem(sys.modules, 'src.rag.chamorro_rag', fake_rag_module)
    svc = ModuleType('api.chatbot_service')
    source = ast.parse((ROOT/'api/chatbot_service.py').read_text())
    function = next(n for n in source.body if isinstance(n, ast.FunctionDef) and n.name == 'get_chatbot_response')
    class TokenManager:
        def __init__(self, **kwargs):
            self.budget = SimpleNamespace(conversation_history=10000, current_message=10000, total=24000, response_buffer=3000)
    db_forbidden = Mock(side_effect=AssertionError('Conversation DB called'))
    completion = Mock(side_effect=AssertionError('Real completion called in free mode'))
    svc.__dict__.update({
        'time': __import__('time'), 'logger': Mock(),
        '_normalize_image_inputs': lambda **k: [], 'is_message_cancelled': lambda _: False,
        'get_conversation_history': db_forbidden, 'log_conversation': db_forbidden,
        '_get_db_connection_with_retry': db_forbidden, 'cleanup_cancelled_message': lambda _: None,
        'detect_image_context': lambda *a, **k: SimpleNamespace(school_announcement=False, card_ids=()),
        'build_image_translation_query': lambda message, _: (message, False),
        'build_contextual_retrieval_query': lambda message, history: history[0]['content']+' '+message,
        'MODE_PROMPTS': {'english': {'prompt': 'Tutor'}},
        'should_use_web_search': lambda *a, **k: (False, None), 'web_search': db_forbidden,
        'resolve_translation_routing_query': lambda message, history, intent: message,
        'resolve_verification_follow_up': lambda message, history: None,
        'resolve_school_message_context': lambda *a, **k: ('', False, ()),
        'get_rag_context': lambda *a, **k: ('tronkon håyu [dictionary]', []),
        'tutor_task_guidance': lambda _: '', '_history_has_images': lambda _: False,
        'build_translation_structure_hints': lambda _: '', 'translation_prompt_guidance': lambda *a, **k: '',
        'is_passage_translation': lambda _: False, 'NO_REFERENCE_GUARD': '',
        'TokenManager': TokenManager, 'TokenBudget': lambda: None,
        'assemble_system_prompt': lambda prompt, context, web, budget: (prompt+context, False),
        'count_message_tokens': lambda _: 1, 'count_tokens': lambda _: 1,
        '_build_current_user_message': lambda message, _: {'role': 'user', 'content': message},
        '_get_max_llm_retries': lambda: 1, 'optional_chat_completion_kwargs': lambda _: {},
        '_extract_non_stream_response_text': lambda r: r.choices[0].message.content,
        'format_source_citations': lambda s: s,
        'llm': SimpleNamespace(chat=SimpleNamespace(completions=SimpleNamespace(create=completion)), close=Mock()),
        'LLM_MODEL_ID': 'test/model', 'CHAT_MODEL': 'test-model',
        'MODEL_CONFIG': {'test-model': {'model_id': 'test/model', 'provider': 'openrouter'}},
        'rag': SimpleNamespace(collection_name='test_collection', vectorstore=SimpleNamespace(_engine=None)),
        'classify_translation_request': lambda _: 'single_word_lookup',
    })
    svc.get_client_for_request = lambda **k: (svc.llm, svc.LLM_MODEL_ID)
    exec(compile(ast.Module(body=[function], type_ignores=[]), 'production_get_chatbot_response', 'exec'), svc.__dict__)
    import api
    monkeypatch.setitem(sys.modules, 'api.chatbot_service', svc)
    monkeypatch.setattr(api, 'chatbot_service', svc, raising=False)
    suite = json.loads(tq.DEFAULT_CASES.read_text())
    case = suite['cases'][0]
    case['history'] = [{'role':'user', 'content':'tree'}, {'role':'assistant', 'content':'prior fixture'}]
    suite['cases'] = [case]
    path = tmp_path / 'suite.json'
    path.write_text(json.dumps(suite))
    output = tmp_path / 'run'
    assert tq.main(['--cases', str(path), '--output', str(output), '--retrieval-only', '--env-file', str(tmp_path/'absent.env')]) == 0
    row = json.loads((output/'cases.jsonl').read_text())
    assert row['error'] is None
    assert row['expected_headwords'] == row['retrieved_headwords'] == 1
    summary = json.loads((output/'summary.json').read_text())
    assert summary['persistence_calls_stubbed'] == 1
    assert summary['response_checks_scored'] == 0
    db_forbidden.assert_not_called()
    completion.assert_not_called()
    # Completed rows are carried forward without a second production request.
    resumed = tmp_path / 'resumed'
    assert tq.main(['--cases', str(path), '--output', str(resumed), '--retrieval-only', '--resume-from', str(output/'cases.jsonl'), '--env-file', str(tmp_path/'absent.env')]) == 0
    assert json.loads((resumed/'summary.json').read_text())['carried_cases'] == 1
    assert json.loads((resumed/'summary.json').read_text())['persistence_calls_stubbed_new'] == 0
    db_forbidden.assert_not_called()
    completion.assert_not_called()


def test_same_model_before_after_key_retains_run_identity(tmp_path):
    paths = []
    for index in range(2):
        path = tmp_path / f'run-{index}.jsonl'
        path.write_text(json.dumps({'id': 'same-case', 'category': 'production', 'history': [], 'user_message': 'test', 'response': 'response', 'model': 'same-model'}))
        paths.append(path)
    tq.export_packet(paths, tmp_path, 3)
    key = json.loads((tmp_path/'blind_review_key.json').read_text())
    assert len({row['run_file'] for row in key}) == 2
    assert {row['model_alias'] for row in key} == {'same-model'}
    assert len({row['response_label'] for row in key}) == 2


def test_advisory_judge_budget_skip_is_explicit(monkeypatch):
    from src.utils import token_manager
    monkeypatch.setattr(token_manager, 'count_message_tokens', lambda _: 100)
    client = SimpleNamespace(chat=SimpleNamespace(completions=SimpleNamespace(create=Mock())))
    result = tq.advisory_judge(client, 'test', {'user_message': 'test', 'expected_behavior': 'answer'}, 'response', .01, (.01, .01))
    assert result == {'status': 'budget_skipped', 'advisory': True}
    client.chat.completions.create.assert_not_called()


def test_retry_completions_accumulate_usage_and_cost(monkeypatch):
    from src.utils import token_manager
    monkeypatch.setattr(token_manager, 'count_message_tokens', lambda _: 10)
    result = SimpleNamespace(usage=SimpleNamespace(prompt_tokens=10, completion_tokens=5, cost=.001), model='test', choices=[SimpleNamespace(finish_reason='stop')])
    capture = tq.CompletionCapture(lambda **k: result, False, (.00001, .00002), 1.)
    for _ in range(2):
        capture.create(messages=[{'role':'user', 'content':'test'}], max_tokens=10)
    assert capture.current['input_tokens'] == 20
    assert capture.current['output_tokens'] == 10
    assert capture.current['reported_cost_usd'] == pytest.approx(.002)
    assert capture.current['completion_calls'] == 2


def test_direct_evidence_labels_are_scored_separately_from_mentions():
    case = next(c for c in tq.load_cases() if c.get('must_not_direct_headwords') == ['gutos'])
    mention = ('[Definition only mentions "chicken" inside a longer description; this is not a '
               'dictionary gloss or translation of "chicken": gutos]\nSource: X\nDefinition: snap off')
    assert tq.score(case, None, mention)['false_direct_evidence'] == []
    direct = '[Direct dictionary gloss for "chicken": mannok]\nAlso recorded as: gutos (X)'
    assert tq.score(case, None, direct)['false_direct_evidence'] == ['gutos']
    canonical = '[Exact English dictionary gloss: chicken]\nChamorro headword: gutos\nSource: X'
    assert tq.score(case, None, canonical)['false_direct_evidence'] == ['gutos']


def test_un_rejection_rule_flags_the_production_error_only():
    case = next(c for c in tq.load_cases() if 'rejects_un_as_only_you' in c['must_not'])
    flagged = tq.score(case, 'In the dictionary, un only means "you (sg.)", so un rato should not be used.', '')
    assert 'rejects_un_as_only_you' in flagged['must_not_violations']
    for wording in ('The dictionary says un means only "you (sg.)", so un rato is incorrect.',
                    'Here un is just "you", so the phrase cannot be right.',
                    'Un means only you (singular) in the dictionary.'):
        assert 'rejects_un_as_only_you' in tq.score(case, wording, '')['must_not_violations'], wording
    supported = tq.score(case, 'The references record un as "you (sg.)" and as "a, an, one" [Chamoru.info dictionary].', '')
    assert 'rejects_un_as_only_you' not in supported['must_not_violations']
    also = tq.score(case, 'The dictionary records un as "you" and also as "a, an, one" [Chamoru.info dictionary].', '')
    assert 'rejects_un_as_only_you' not in also['must_not_violations']


def test_used_retrieval_counts_evidence_kept_in_the_final_prompt():
    case = tq.load_cases()[0]
    full, kept = tq.digest('retrieved but cut by the prompt budget'), tq.digest('[Direct dictionary gloss]')
    base = dict(tq.score(case, None, ''), id='x', category=case['category'], expected_behavior='answer',
                router='none', expected_router='none', latency_s=1, error=None)
    rows = [
        dict(base, evidence_hash=full, retained_evidence_hash=tq.EMPTY_DIGEST),  # truncated away entirely
        dict(base, evidence_hash=full, retained_evidence_hash=kept),
        dict(base, evidence_hash=tq.EMPTY_DIGEST, retained_evidence_hash=tq.EMPTY_DIGEST),
        dict(base, evidence_hash=full),  # a row recorded before the retained digest existed
    ]
    summary = tq.summarize(rows, {})
    assert summary['used_retrieval_cases'] == 2
    assert summary['retrieved_evidence_cases'] == 3


def test_subset_summaries_compare_suite_versions():
    case = tq.load_cases()[0]
    row = dict(tq.score(case, 'A supported answer [dictionary].', 'tronkon håyu'), category=case['category'],
               expected_behavior='answer', router='none', expected_router='none', latency_s=1, error=None)
    subsets = tq.subset_summaries([dict(row, id='tq1-001'), dict(row, id='tq2-001', retrieved_headwords=0)])
    assert subsets['tq1']['expected_headword_recall'] == 1
    assert subsets['tq2']['expected_headword_recall'] == 0
    assert tq.subset_summaries([dict(row, id='tq1-001')]) == {}


def test_answer_use_is_scored_separately_from_retrieval_presence():
    case = next(c for c in tq.load_cases() if c['expected_retrieved_headwords'])
    headword = case['expected_retrieved_headwords'][0]['any_of'][0]['headword']
    unused = tq.score(case, 'A reply that never names the word.', f'Definition entry: {headword}')
    assert unused['retrieved_headwords'] >= 1 and unused['answer_used_headwords'] == 0
    used = tq.score(case, f'Use **{headword}** here [dictionary].', '')
    assert used['retrieved_headwords'] == 0 and used['answer_used_headwords'] >= 1
    assert tq.score(case, None, headword)['answer_used_headwords'] is None


def test_non_answer_detection_widens_without_changing_the_legacy_refusal_signal():
    case = next(c for c in tq.load_cases() if c['user_message'] == 'Review Chamorro colors')
    colors = ('The supplied references do not include Chamorro color words, so I can’t accurately review them '
              'from the available sources. Send me the color list or a source, and I’ll review the Guam spelling.')
    result = tq.score(case, colors, '')
    assert result['refusal'] is False and result['refusal_or_non_answer'] is True
    # Asking for the requested material is enough even without a hedged "can't".
    unhedged = 'The supplied references do not include color words. Send me the color list and I will review it.'
    assert tq.score(case, unhedged, '')['refusal_or_non_answer'] is True
    # The T4-r1 paid run's wording for the same non-answer.
    no_terms = ("I don’t have any supplied Chamorro color terms to review. "
                "Please send the color list or the specific words you want checked.")
    assert tq.score(case, no_terms, '')['refusal'] is False
    assert tq.score(case, no_terms, '')['refusal_or_non_answer'] is True
    partial = ('**tronkon håyu** is supported as “tree” [Chamoru.info dictionary], but the supplied references '
               'do not cover “all.” Send me the full sentence if you want a draft.')
    assert tq.score(case, partial, '')['refusal_or_non_answer'] is False
    # A supported answer that then declines part of the request is still flagged
    # by the documented inability branch, not the coverage branch.
    mixed = ('**tronkon håyu** is supported as “tree” [Chamoru.info dictionary]. '
             'I cannot review the remaining words.')
    assert tq.CANNOT_ANSWER.search(mixed) and not tq.LACKS_COVERAGE.search(mixed)
    assert tq.score(case, mixed, '')['refusal_or_non_answer'] is True
    assert tq.score(case, mixed, '')['refusal'] is False
    rows = [dict(tq.score(case, text, ''), id=f'tq1-00{i}', category=case['category'], expected_behavior='answer',
                 router='none', expected_router='none', latency_s=1, error=None)
            for i, text in enumerate((colors, partial))]
    summary = tq.summarize(rows, {})
    assert summary['refusal_count'] == 0
    assert summary['refusal_or_non_answer_count'] == 1
    assert summary['refusal_or_non_answer_case_ids'] == ['tq1-000']


def test_strong_chamorro_headword_labels_count_as_false_direct_evidence():
    case = next(c for c in tq.load_cases() if c.get('must_not_direct_headwords') == ['gutos'])
    exact = '[Exact dictionary headword "gutos": gutos]\nSource: X\nDefinition: snap off'
    assert tq.score(case, None, exact)['false_direct_evidence'] == ['gutos']
    lead = '[Chamorro headword spelled like "gutos" (not a translation): gutos]\nSource: X'
    assert tq.score(case, None, lead)['false_direct_evidence'] == []
