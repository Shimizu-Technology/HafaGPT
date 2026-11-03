import pytest

from api.dictionary_service import DictionaryService, normalize_chamorro


@pytest.mark.parametrize('query,expected', [
    ('tree', 'tronkon håyu'), ('banana', "aga'"), ('blue', 'asut'), ('happy', 'magof'),
])
def test_complete_english_gloss_comes_before_incidental_mentions(query, expected):
    service = DictionaryService()
    results = service.search(query)
    if query == 'happy':
        assert any(word['chamorro'] == expected for word in results[:5])
    else:
        assert normalize_chamorro(results[0]['chamorro']) == normalize_chamorro(expected)
    assert service.get_word_by_id(results[0]['word_id']) == results[0]
    assert service.get_word(results[0]['chamorro'])['chamorro'] == results[0]['chamorro']


def test_tree_reference_keeps_source_identity_and_revised_practice_scope():
    service = DictionaryService()
    results = service.search('tree')
    tree = results[0]
    assert tree['definition'] == 'Tree.'
    assert tree['word_id'].startswith('chamoru-info-word-v1-')
    assert tree['trust']['sources'][0]['name'] == 'Chamoru.info dictionary'
    assert next(i for i, word in enumerate(results) if word['chamorro'] == 'chacha') > 0
    assert len(service._word_list) == 10350
    assert len({word['chamorro'].casefold() for word in results}) == len(results)


def test_search_strips_whitespace_and_preserves_exact_chamorro_priority():
    service = DictionaryService()
    assert service.search(' tree ')[0] == service.search('tree')[0]
    assert service.search('chacha')[0]['chamorro'] == 'chacha'
