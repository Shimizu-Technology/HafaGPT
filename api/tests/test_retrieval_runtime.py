"""Reference lookup cancellation stays bounded and releases its own resources."""
import threading
from contextlib import closing
from types import SimpleNamespace
from unittest.mock import Mock

import pytest

from src.rag import chamorro_rag, retrieval_runtime
from src.rag.chamorro_rag import ChamorroRAG, ResponsiveOpenAIEmbeddings
from src.rag.retrieval_runtime import RetrievalStopped, check_retrieval, retrieval_scope
from test_atomic_regeneration import deferred_stream_namespace
from test_saved_reply_integrity import load_function
from test_source_aware_retrieval import FakeRAG, _load_get_rag_context


def bare_rag():
    rag = ChamorroRAG.__new__(ChamorroRAG)
    rag.collection_name = 'fixture-collection'
    return rag


def test_cloud_embedding_and_vector_connections_have_interactive_time_bounds(monkeypatch):
    embeddings = Mock()
    monkeypatch.setattr(chamorro_rag, 'ResponsiveOpenAIEmbeddings', embeddings)
    monkeypatch.setattr(ChamorroRAG, '_init_vectorstore', lambda self: None)
    monkeypatch.setenv('EMBEDDING_MODE', 'openai')
    ChamorroRAG(collection_name='chamorro_grammar')
    assert embeddings.call_args.kwargs['request_timeout'] == 5.0
    assert embeddings.call_args.kwargs['max_retries'] == 0


def test_vector_pool_and_sql_queries_are_bounded_without_replacing_shared_engines(monkeypatch):
    vector = Mock()
    monkeypatch.setattr(chamorro_rag, 'PGVector', vector)
    monkeypatch.setattr(ChamorroRAG, '_assert_embedding_contract', lambda self: None)
    rag = bare_rag(); rag.embeddings = object(); rag.connection = 'postgresql://fixture'
    rag._init_vectorstore()
    assert vector.call_args.kwargs['engine_args'] == {
        'connect_args': retrieval_runtime.database_connect_options(),
        'pool_timeout': 5, 'pool_pre_ping': True,
    }
    existing_store = rag.vectorstore
    operation = Mock(side_effect=[ConnectionError('connection lost'), 'reconnected'])
    monkeypatch.setattr(chamorro_rag.time, 'sleep', lambda seconds: None)
    assert rag._retry_on_connection_error(operation) == 'reconnected'
    assert rag.vectorstore is existing_store
    assert vector.call_count == 1


def test_stop_after_embedding_prevents_the_vector_query(monkeypatch):
    stopped = False
    def embed(self, text, **kwargs):
        nonlocal stopped
        stopped = True
        return [0.0] * 384
    monkeypatch.setattr(chamorro_rag.OpenAIEmbeddings, 'embed_query', embed)
    embedding = ResponsiveOpenAIEmbeddings.model_construct()
    query = Mock()
    with retrieval_scope(lambda: stopped), pytest.raises(RetrievalStopped):
        vector = embedding.embed_query('fixture')
        query(vector)
    query.assert_not_called()


def test_stop_between_retrieval_lanes_prevents_more_queries_and_retries(monkeypatch):
    stopped = False
    def search(*args, **kwargs):
        nonlocal stopped
        stopped = True
        return []
    rag = bare_rag()
    rag.vectorstore = SimpleNamespace(similarity_search_with_score=Mock(side_effect=search))
    monkeypatch.setattr(chamorro_rag, '_requires_grammar_evidence', lambda *args: True)
    with retrieval_scope(lambda: stopped), pytest.raises(RetrievalStopped):
        rag.search('Explain verb prefixes and sentence structure')
    assert rag.vectorstore.similarity_search_with_score.call_count == 1


@pytest.mark.parametrize('method', ['_keyword_search_dictionaries', '_english_to_chamorro_search'])
@pytest.mark.parametrize('outcome', ['timeout', 'cancel'])
def test_lexical_connection_and_cursor_close_on_timeout_or_stop(method, outcome):
    stopped = False
    cursor = Mock()
    if outcome == 'timeout':
        cursor.execute.side_effect = TimeoutError('statement timeout')
    else:
        def fetch():
            nonlocal stopped
            stopped = True
            return []
        cursor.fetchall.side_effect = fetch
    connection = Mock(); connection.cursor.return_value = cursor
    rag = bare_rag(); rag._get_db_connection_with_retry = lambda: connection
    rag.vectorstore = Mock()
    with retrieval_scope(lambda: stopped), pytest.raises(TimeoutError if outcome == 'timeout' else RetrievalStopped):
        getattr(rag, method)('fixture')
    cursor.close.assert_called_once()
    connection.close.assert_called_once()
    rag.vectorstore.similarity_search.assert_not_called()


def test_request_scope_budget_and_cancellation_do_not_leak_to_other_threads(monkeypatch):
    clock = [0.0]
    monkeypatch.setattr(retrieval_runtime.time, 'monotonic', lambda: clock[0])
    other_thread = Mock(side_effect=check_retrieval)
    with retrieval_scope(lambda: False):
        thread = threading.Thread(target=other_thread)
        thread.start(); thread.join(2)
        assert not thread.is_alive()
        clock[0] = 16.0
        with pytest.raises(RetrievalStopped, match='budget'):
            check_retrieval()
    check_retrieval()
    other_thread.assert_called_once()


def test_stop_during_reference_lookup_saves_cancelled_exchange_without_calling_provider():
    namespace = deferred_stream_namespace('success')
    stopped = False
    def lookup(*args, **kwargs):
        nonlocal stopped
        assert kwargs['cancelled']() is False
        stopped = True
        assert kwargs['cancelled']() is True
        return '', []
    namespace['get_rag_context'] = lookup
    namespace['is_message_cancelled'] = lambda pending: stopped
    provider = Mock()
    namespace['get_client_for_request'] = provider
    namespace['log_conversation'].return_value = True
    stream = load_function('get_chatbot_response_stream', namespace)
    events = list(stream('Question', conversation_id='conv-a', pending_id='pending_fixture', history_override=[]))
    assert events[-1]['type'] == 'cancelled' and events[-1]['saved'] is True
    assert namespace['log_conversation'].call_args.kwargs['bot_response'] == '[Message was cancelled by user]'
    namespace['log_conversation'].assert_called_once()
    namespace['cleanup_cancelled_message'].assert_called_once()
    provider.assert_not_called()


def test_history_cursor_and_connection_close_when_query_times_out():
    cursor = Mock(); cursor.execute.side_effect = TimeoutError('statement timeout')
    connection = Mock(); connection.cursor.return_value = cursor
    history = load_function('get_conversation_history', {
        '_get_db_connection_with_retry': lambda: connection, 'closing': closing,
    })
    assert history('fixture') == []
    cursor.close.assert_called_once()
    connection.close.assert_called_once()


def test_slow_vector_lookup_preserves_governed_canonical_evidence():
    rag = FakeRAG()
    rag.create_context = Mock(side_effect=RetrievalStopped('Reference lookup time budget exceeded'))
    retrieve, _ = _load_get_rag_context(fake_rag=rag, card_context='')
    context, sources = retrieve('What does fixture mean?')
    assert context == 'canonical context'
    assert sources == [{'name': 'Canonical', 'page': None}]
    rag.create_context.assert_called_once()


def test_cancelled_scope_never_starts_an_embedding_lookup():
    rag = FakeRAG(); rag.create_context = Mock()
    retrieve, _ = _load_get_rag_context(fake_rag=rag, card_context='')
    retrieve('What does fixture mean?', cancelled=lambda: True)
    rag.create_context.assert_not_called()
