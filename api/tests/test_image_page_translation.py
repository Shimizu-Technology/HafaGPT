import json
from types import SimpleNamespace

from api.image_translation import translate_image_pages
from src.rag.image_translation_context import ImagePageContext, ImageTextItem, ImageTranslationContext


def page(index, n=4, **kwargs):
    return ImagePageContext(image_index=index, items=tuple(
        ImageTextItem(id=f'p{index+1}-i{i+1}', text=f'{i+1}. Repeated option', kind='body') for i in range(n)
    ), text_confidence='high', complete=True, **kwargs)


def response(items, finish='stop'):
    return SimpleNamespace(choices=[SimpleNamespace(finish_reason=finish, message=SimpleNamespace(
        content=json.dumps({'notes': '', 'translations': [dict(id=item.id, translation='Translated '+item.id, uncertain=False) for item in items]})
    ))])


def run(pages, complete, cancelled=lambda: False):
    return list(translate_image_pages(
        context=ImageTranslationContext(pages=tuple(pages)),
        images=[{'data': f'img{i}', 'content_type': 'image/png'} for i in range(len(pages))],
        message='What do these pages say?', complete=complete,
        retrieve=lambda *args, **kwargs: ('RETAIN THIS EVIDENCE', [{'name':'Example dictionary'}]),
        cancelled=cancelled,
    ))


def test_all_pages_and_repeated_choices_are_rendered_once_in_order():
    pages = [page(i) for i in range(3)]
    calls=[]
    def complete(**kwargs):
        calls.append(kwargs)
        return response(pages[(len(calls)-1)//2].items)
    events=run(pages, complete)
    text=''.join(e['content'] for e in events if e['type']=='chunk')
    for p in pages:
        assert f'## Image {p.image_index+1}' in text
        for item in p.items:
            assert text.count('Translated '+item.id.replace('-', r'\-')) == 1
    assert len(calls) == 6
    assert all('RETAIN THIS EVIDENCE' in c['messages'][0]['content'] for c in calls)
    assert events[-1]['translation_incomplete'] is False


def test_omission_retries_then_marks_every_missing_item_without_accepting_partial_answer():
    p=page(0)
    calls=[]
    def complete(**kwargs):
        calls.append(kwargs)
        return response(p.items[:-1])
    events=run([p], complete)
    text=''.join(e.get('content','') for e in events)
    assert len(calls)==2
    assert text.count('Translation unavailable for this item')==4
    assert 'Translated ' not in text
    assert events[-1]['translation_incomplete'] is True
    assert events[-1]['sources']==[]


def test_length_finish_is_never_accepted_as_complete_even_with_valid_json():
    p=page(0)
    events=run([p], lambda **kwargs: response(p.items, finish='length'))
    assert events[-1]['translation_incomplete'] is True


def test_failed_page_remains_in_place_and_later_page_still_translates():
    failed=ImagePageContext(image_index=0,items=(),text_confidence='low',complete=False,issues=('extraction_failed',))
    good=page(1)
    events=run([failed,good], lambda **kwargs: response(good.items))
    text=''.join(e.get('content','') for e in events)
    assert text.index('## Image 1') < text.index("couldn't read") < text.index('## Image 2')
    assert r'Translated p2\-i4' in text


def test_duplicate_item_ids_are_rejected():
    p=page(0)
    bad=[p.items[0]]*4
    events=run([p], lambda **kwargs: response(bad))
    assert events[-1]['translation_incomplete'] is True


def test_provider_error_does_not_prevent_later_pages():
    pages=[page(0),page(1)]
    count=0
    def complete(**kwargs):
        nonlocal count
        count+=1
        if count<=2:
            raise RuntimeError('unavailable')
        return response(pages[1].items)
    events=run(pages, complete)
    assert count==4
    assert r'Translated p2\-i4' in ''.join(e.get('content','') for e in events)


def test_cancel_stops_before_provider_call():
    events=run([page(0)], lambda **kwargs: (_ for _ in ()).throw(AssertionError()), cancelled=lambda:True)
    assert [e['type'] for e in events]==['cancelled']


def test_large_page_is_split_and_final_choices_preserved():
    p=page(0,45)
    calls=[]
    def complete(**kwargs):
        calls.append(kwargs)
        ids={x['id'] for x in json.loads(kwargs['messages'][1]['content'][0]['text'])['items']}
        return response([item for item in p.items if item.id in ids])
    events=run([p],complete)
    assert len(calls)==6
    assert r'Translated p1\-i45' in ''.join(e.get('content','') for e in events)


def test_app_guidance_documents_and_recent_context_reach_translation():
    p = page(0)
    calls = []
    def complete(**kwargs):
        calls.append(kwargs)
        result = response(p.items)
        payload = json.loads(result.choices[0].message.content)
        payload['notes'] = 'Bring the form tomorrow.'
        result.choices[0].message.content = json.dumps(payload)
        return result
    events = list(translate_image_pages(
        context=ImageTranslationContext(pages=(p,)),
        images=[{'data':'img','content_type':'image/png'}],
        message='What does this say?\n\n--- Document Content ---\nEssential instructions',
        complete=complete, retrieve=lambda *a, **kw: ('', []), cancelled=lambda:False,
        guidance='Explain necessary school-family actions. Keep the entire response in Chamorro.',
        history=[{'role':'user','content':'My earlier question about the form'}],
    ))
    prompt = calls[0]['messages'][0]['content']
    request = json.loads(calls[0]['messages'][1]['content'][0]['text'])
    assert 'Keep the entire response in Chamorro.' in prompt
    assert 'Essential instructions' in request['request']
    assert 'earlier question' in request['recent_context']
    text = ''.join(event.get('content','') for event in events)
    assert text.index('Bring the form tomorrow') < text.index('**Original:**')


def test_retrieval_outage_preserves_item_coverage_without_false_citations():
    p = page(0)
    def retrieve(*args, **kwargs):
        raise RuntimeError('outage')
    events = list(translate_image_pages(
        context=ImageTranslationContext(pages=(p,)),
        images=[{'data':'img','content_type':'image/png'}], message='Translate',
        complete=lambda **kwargs:response(p.items), retrieve=retrieve, cancelled=lambda:False,
    ))
    assert events[-1]['sources'] == []
    assert events[-1]['used_rag'] is False
    assert ''.join(event.get('content','') for event in events).count('**Translation:**') == 4
