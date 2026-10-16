import json
from types import SimpleNamespace

import pytest

from api.image_translation import _PageRenderer, looks_english, translate_image_pages
from src.rag.image_translation_context import ImagePageContext, ImageTextItem, ImageTranslationContext


def page(index, n=4, **kwargs):
    return ImagePageContext(image_index=index, items=tuple(
        ImageTextItem(id=f'p{index+1}-i{i+1}', text=f'{i+1}. Repeated option', kind='body') for i in range(n)
    ), text_confidence='high', complete=True, **kwargs)


def tagged(items, overview='A practice worksheet.', translate=lambda item: 'Translated ' + item.id):
    return overview + '\n\n' + ''.join(f'[[{item.id}]] {item.text} >> {translate(item)}\n' for item in items)


def streamer(*texts, finish='stop', fail=None):
    """Fake streaming provider returning one scripted stream per call, split into small pieces."""
    calls = []
    def stream_text(**kwargs):
        calls.append(kwargs)
        script = texts[min(len(calls), len(texts)) - 1]
        if fail and fail(len(calls)):
            raise RuntimeError('unavailable')
        text = script(kwargs) if callable(script) else script
        for start in range(0, len(text), 7):
            yield text[start:start + 7], None
        yield '', finish
    return stream_text, calls


def fill_response(items, finish='stop', translation='Filled '):
    return SimpleNamespace(choices=[SimpleNamespace(finish_reason=finish, message=SimpleNamespace(
        content=json.dumps({'translations': [dict(id=item.id, translation=translation + item.id, uncertain=False) for item in items]})
    ))])


def run(pages, stream_text, complete=None, cancelled=lambda: False, **kwargs):
    return list(translate_image_pages(
        context=ImageTranslationContext(pages=tuple(pages)),
        images=[{'data': f'img{i}', 'content_type': 'image/png'} for i in range(len(pages))],
        message=kwargs.pop('message', 'What do these pages say?'), stream_text=stream_text,
        complete=complete or (lambda **kw: (_ for _ in ()).throw(AssertionError('unexpected follow-up'))),
        retrieve=kwargs.pop('retrieve', lambda *args, **kw: ('RETAIN THIS EVIDENCE', [{'name': 'Example dictionary'}])),
        cancelled=cancelled, **kwargs,
    ))


def text_of(events):
    return ''.join(event.get('content', '') for event in events if event['type'] == 'chunk')


def test_every_item_streams_once_in_order_with_overview_first():
    p = page(0)
    stream_text, calls = streamer(tagged(p.items))
    events = run([p], stream_text)
    text = text_of(events)
    assert text.startswith('A practice worksheet')
    positions = [text.index('Translated p1\\-i' + str(n)) for n in range(1, 5)]
    assert positions == sorted(positions)
    assert all(text.count('Translated p1\\-i' + str(n)) == 1 for n in range(1, 5))
    assert '## Photo' not in text and '## Image' not in text
    assert 'p1-i1' not in text.replace('\\-', '-').replace('Translated p1-i1', '')
    assert 'RETAIN THIS EVIDENCE' in calls[0]['messages'][0]['content']
    assert events[-1]['translation_incomplete'] is False and events[-1]['generation_complete'] is True
    assert events[-1]['sources'] == [{'name': 'Example dictionary'}]


def test_progress_is_reported_before_translation_starts():
    p = page(0)
    stream_text, _ = streamer(tagged(p.items))
    events = run([p], stream_text)
    first_chunk = next(i for i, event in enumerate(events) if event['type'] == 'chunk')
    status = next(i for i, event in enumerate(events) if event['type'] == 'status')
    assert status < first_chunk and events[status]['content'] == 'Translating…'


def test_multiple_photos_get_headings_and_failed_photo_stays_in_place():
    failed = ImagePageContext(image_index=0, items=(), text_confidence='low', complete=False, issues=('extraction_failed',))
    good = page(1)
    stream_text, calls = streamer(tagged(good.items))
    events = run([failed, good], stream_text)
    text = text_of(events)
    assert text.index('## Photo 1') < text.index("couldn't read") < text.index('## Photo 2')
    assert 'Translated p2\\-i4' in text and len(calls) == 1
    assert events[-1]['generation_complete'] is False
    assert [e['content'] for e in events if e['type'] == 'status'] == ['Translating photo 2 of 2…']


def test_items_already_in_the_target_language_are_shown_once_without_translation():
    items = (ImageTextItem('p1-i1', 'Ecosystems: Interactions, Energy, and Dynamics'),
             ImageTextItem('p1-i2', "Poddong i simiya gi edda'."))
    p = ImagePageContext(0, items, 'high', True)
    stream_text, _ = streamer("A worksheet.\n\n[[p1-i1]] Ecosystems: Interactions, Energy, and Dynamics >> =\n"
                              "[[p1-i2]] Poddong i simiya gi edda'. >> The seed falls onto the soil.\n")
    text = text_of(run([p], stream_text))
    assert text.count('Ecosystems\\: Interactions, Energy, and Dynamics') == 1
    assert '**Ecosystems' not in text
    assert "**Poddong i simiya gi edda'\\.**  \nThe seed falls onto the soil\\." in text


def test_genuine_doubt_is_marked_once_without_inflating_other_items():
    items = (ImageTextItem('p1-i1', 'Malingu i trongko.'), ImageTextItem('p1-i2', 'Acho\''))
    p = ImagePageContext(0, items, 'high', True)
    stream_text, _ = streamer("A worksheet.\n[[p1-i1]] Malingu i trongko. >> ? The tree disappears — the photo is blurred here\n"
                              "[[p1-i2]] Acho' >> Rock\n")
    events = run([p], stream_text)
    text = text_of(events)
    assert 'The tree disappears *\\(unsure\\: the photo is blurred here\\)*' in text
    assert text.count('unsure') == 1
    assert events[-1]['translation_incomplete'] is True


def test_model_correction_of_a_misread_line_is_shown_but_a_different_line_is_not():
    items = (ImageTextItem('p1-i1', "Påttern 1: Kinalamten i Lina'la'"), ImageTextItem('p1-i2', 'a. Hågon'))
    p = ImagePageContext(0, items, 'high', True)
    stream_text, _ = streamer("Worksheet.\n[[p1-i1]] Påtten 1: Kinalamten i Lina'la' >> Part 1\n"
                              "[[p1-i2]] Something entirely different >> a. Leaf\n")
    text = text_of(run([p], stream_text))
    assert "**Påtten 1\\: Kinalamten i Lina'la'**" in text
    assert '**a\\. Hågon**' in text and 'entirely different' not in text


def test_skipped_items_are_filled_by_a_validated_follow_up():
    p = page(0)
    stream_text, _ = streamer(tagged(p.items[:2]))
    follow_ups = []
    def complete(**kwargs):
        follow_ups.append(kwargs)
        ids = {item['id'] for item in json.loads(kwargs['messages'][1]['content'][0]['text'])['items']}
        return fill_response([item for item in p.items if item.id in ids])
    events = run([p], stream_text, complete)
    text = text_of(events)
    assert len(follow_ups) == 1 and follow_ups[0]['response_format']['type'] == 'json_schema'
    assert text.index('Translated p1\\-i2') < text.index('More from this photo') < text.index('Filled p1\\-i3')
    assert 'Filled p1\\-i4' in text
    assert events[-1]['generation_complete'] is True


def test_items_still_missing_after_follow_up_are_reported_never_dropped():
    p = page(0)
    stream_text, _ = streamer(tagged(p.items[:1]), finish='length')
    events = run([p], stream_text, lambda **kwargs: fill_response(p.items, finish='length'))
    text = text_of(events)
    for item in p.items[1:]:
        assert item.text.replace('.', '\\.') in text
    assert text.count('translation unavailable') == 3
    assert events[-1]['translation_incomplete'] is True and events[-1]['generation_complete'] is False


def test_stream_failure_falls_back_to_follow_up_for_the_whole_page():
    p = page(0)
    stream_text, _ = streamer('', fail=lambda call: True)
    events = run([p], stream_text, lambda **kwargs: fill_response(p.items))
    text = text_of(events)
    assert all(f'Filled p1\\-i{n}' in text for n in range(1, 5))
    assert events[-1]['generation_complete'] is True


def test_provider_failure_does_not_prevent_later_photos():
    pages = [page(0), page(1)]
    stream_text, calls = streamer('', lambda kwargs: tagged(pages[1].items), fail=lambda call: call == 1)
    events = run(pages, stream_text, lambda **kwargs: (_ for _ in ()).throw(RuntimeError('down')))
    text = text_of(events)
    assert len(calls) == 2 and 'Translated p2\\-i4' in text
    assert text.count('translation unavailable') == 4
    assert events[-1]['generation_complete'] is False


def test_duplicate_and_unknown_ids_are_ignored():
    p = page(0, 2)
    stream_text, _ = streamer('Page.\n[[p1-i1]] 1. Repeated option >> First\n[[p1-i1]] 1. Repeated option >> Again\n'
                              '[[p9-i9]] Injected >> Nope\n[[p1-i2]] 2. Repeated option >> Second\n')
    text = text_of(run([p], stream_text))
    assert 'First' in text and 'Again' not in text and 'Nope' not in text and 'Second' in text


def test_model_text_is_rendered_as_plain_text():
    p = page(0, 1)
    stream_text, _ = streamer('See [this](https://evil.example) <img src=x>\n'
                              '[[p1-i1]] 1. Repeated option >> **Bold** ![x](https://evil.example/a.png)\n'
                              'Notes: Bring the <b>form</b>.\n')
    text = text_of(run([p], stream_text))
    assert '](https' not in text.replace('\\]\\(https', '') and '<img' not in text and '<b>' not in text
    assert '**Notes**' in text and 'Bring the &lt;b&gt;form&lt;/b&gt;' in text


def test_prose_drifting_between_items_is_dropped_but_notes_are_kept():
    p = page(0, 2)
    stream_text, _ = streamer('Overview line.\n[[p1-i1]] 1. Repeated option >> One\nStray commentary\n'
                              '[[p1-i2]] 2. Repeated option >> Two\nNotes: Due Friday.\n')
    text = text_of(run([p], stream_text))
    assert 'Overview line' in text and 'Stray commentary' not in text and 'Due Friday' in text


def test_cancel_stops_before_provider_call():
    stream_text, calls = streamer('unused')
    events = run([page(0)], stream_text, cancelled=lambda: True)
    assert [e['type'] for e in events] == ['cancelled'] and calls == []


def test_cancel_during_stream_stops_without_follow_up():
    p = page(0)
    state = {'chunks': 0}
    def stream_text(**kwargs):
        for piece in tagged(p.items).split('\n'):
            state['chunks'] += 1
            yield piece + '\n', None
    events = run([p], stream_text, cancelled=lambda: state['chunks'] >= 2)
    assert events[-1]['type'] == 'cancelled'


def test_request_carries_items_history_and_guidance_without_tutor_prose_rules():
    p = page(0)
    stream_text, calls = streamer(tagged(p.items))
    run([p], stream_text, message='What does this say?\n\n--- Document Content ---\nEssential instructions',
        guidance='REVIEWED COMPOSITIONAL HINT', history=[{'role': 'user', 'content': 'My earlier question about the form'}],
        target='Write every translation and note in Chamorro only.', school_announcement=True)
    prompt = calls[0]['messages'][0]['content']
    request = json.loads(calls[0]['messages'][1]['content'][0]['text'])
    image = calls[0]['messages'][1]['content'][1]['image_url']
    assert 'REVIEWED COMPOSITIONAL HINT' in prompt and 'Chamorro only' in prompt
    assert 'what the message asks the family to do' in prompt
    assert [item['id'] for item in request['items']] == [item.id for item in p.items]
    assert 'Essential instructions' in request['request']
    assert 'earlier question' in request['recent_conversation']
    assert image['url'] == 'data:image/png;base64,img0'


def test_retrieval_skips_english_lines_and_outage_keeps_coverage_without_citations():
    items = (ImageTextItem('p1-i1', 'Write your name and the date on the line.'),
             ImageTextItem('p1-i2', "Håfa ma susedi annai ha' kåkanno' i fanihi i fruta?"))
    p = ImagePageContext(0, items, 'high', True)
    queries = []
    def retrieve(query, **kwargs):
        queries.append(query)
        raise RuntimeError('outage')
    stream_text, _ = streamer(tagged(items))
    events = run([p], stream_text, retrieve=retrieve)
    assert 'fanihi' in queries[0] and 'Write your name' not in queries[0]
    assert events[-1]['sources'] == [] and events[-1]['used_rag'] is False
    assert text_of(events).count('Translated p1') == 2


def test_unclear_transcript_items_stay_marked_uncertain():
    items = (ImageTextItem('p1-i1', '[unclear]', 'unclear'),)
    p = ImagePageContext(0, items, 'high', False)
    stream_text, _ = streamer('Page.\n[[p1-i1]] [unclear] >> A smudged word\n')
    events = run([p], stream_text)
    text = text_of(events)
    assert "couldn't be read clearly" in text and 'unsure' in text
    assert events[-1]['translation_incomplete'] is True


def test_renderer_handles_lines_split_across_stream_chunks():
    renderer = _PageRenderer([ImageTextItem('p1-i1', 'Fruta')])
    out = list(renderer.feed('Over')) + list(renderer.feed('view.\n[[p1-')) + list(renderer.feed('i1]] Fruta >> Fru')) + list(renderer.finish())
    assert out[0] == 'Overview\\.\n\n' and out[1] == '**Fruta**  \nFru\n\n'


def test_english_detection_is_conservative():
    assert looks_english('Write your name and the date on the line.')
    assert not looks_english("Håfa ma susedi annai ha' kåkanno' i fanihi i fruta?")
    assert not looks_english('a. Fruta')


def test_a_cut_off_last_line_is_filled_instead_of_saved_half_translated():
    p = page(0, 2)
    stream_text, _ = streamer('Page.\n[[p1-i1]] 1. Repeated option >> One\n[[p1-i2]] 2. Repeated option >> Half a transl', finish='length')
    events = run([p], stream_text, lambda **kwargs: fill_response([p.items[1]]))
    text = text_of(events)
    assert 'Half a transl' not in text and 'Filled p1\\-i2' in text
    assert events[-1]['generation_complete'] is True


def test_a_line_without_separator_is_never_shown_as_its_own_translation():
    p = ImagePageContext(0, (ImageTextItem('p1-i1', 'Håfa adai'),), 'high', True)
    stream_text, _ = streamer('Page.\n[[p1-i1]] Håfa adai\n>> Hello\n')
    text = text_of(run([p], stream_text, lambda **kwargs: fill_response(p.items, translation='Hello ')))
    assert text.count('Håfa adai') == 1 and 'Hello p1' in text


@pytest.mark.parametrize('transcribed,printed', [
    ('Ti ya-hu', 'Ya-hu'),
    ("Hu tungo' i lepblo", "Ti hu tungo' i lepblo"),
    ('Bring $25 by October 12', 'Bring $26 by October 13'),
    ('Call the office tomorrow about the trip', 'Call the office tomorrow about the trip 671-555-0100'),
    ('Ti ya-hu', 'Si ya-hu'),
])
def test_model_reading_cannot_change_words_numbers_or_add_contacts(transcribed, printed):
    p = ImagePageContext(0, (ImageTextItem('p1-i1', transcribed),), 'high', True)
    stream_text, _ = streamer(f'Page.\n[[p1-i1]] {printed} >> Meaning\n')
    text = text_of(run([p], stream_text))
    assert _plain(printed) not in text and _plain(transcribed) in text


def _plain(text):
    from api.image_translation import _plain_markdown
    return _plain_markdown(text)


def test_worksheet_blanks_survive_and_unclear_items_keep_their_warning():
    items = (ImageTextItem('p1-i1', 'Ha ______ i lepblo'), ImageTextItem('p1-i2', '[unclear] Grades', 'unclear'))
    p = ImagePageContext(0, items, 'high', False)
    stream_text, _ = streamer('Page.\n[[p1-i1]] Ha ______ i lepblo >> He ______ the book\n[[p1-i2]] [unclear] Grades >> =\n')
    events = run([p], stream_text)
    text = text_of(events)
    assert '\\_\\_\\_\\_\\_\\_' in text and 'He \\_\\_\\_\\_\\_\\_ the book' in text
    assert 'unsure' in text and events[-1]['translation_incomplete'] is True


def test_dashes_in_a_confident_translation_are_not_mistaken_for_a_reason():
    p = ImagePageContext(0, (ImageTextItem('p1-i1', 'Grådo 1 - 5'),), 'high', True)
    stream_text, _ = streamer('Page.\n[[p1-i1]] Grådo 1 - 5 >> Grades 1 - 5 must attend\n')
    text = text_of(run([p], stream_text))
    assert 'Grades 1 \\- 5 must attend' in text and 'unsure' not in text


def test_equals_and_urls_never_become_markdown_structure():
    p = page(0, 2)
    def fill(**kwargs):
        return SimpleNamespace(choices=[SimpleNamespace(finish_reason='stop', message=SimpleNamespace(
            content=json.dumps({'translations': [{'id': 'p1-i2', 'translation': '=', 'uncertain': False}]})))])
    stream_text, _ = streamer('See https://evil.example/x\n[[p1-i1]] 1. Repeated option >> ==\n')
    text = text_of(run([p], stream_text, fill))
    assert 'https\\://' in text and '\\=\\=' in text
    assert '**2\\. Repeated option**' not in text and '2\\. Repeated option\n\n' in text


def test_notes_are_capped():
    p = page(0, 1)
    stream_text, _ = streamer('Page.\n[[p1-i1]] 1. Repeated option >> One\nNotes: first\nsecond\nthird\nfourth\nfifth\n')
    text = text_of(run([p], stream_text))
    assert 'third' in text and 'fourth' not in text and 'fifth' not in text


def test_numbered_item_lines_are_recognised():
    p = page(0, 2)
    stream_text, _ = streamer('Page.\n1. [[p1-i1]] 1. Repeated option >> One\n2) [[p1-i2]] 2. Repeated option >> Two\n')
    text = text_of(run([p], stream_text))
    assert 'One' in text and 'Two' in text and 'p1' not in text.replace('\\-', '-').replace('Repeated', '')


def test_cancel_during_the_follow_up_is_honoured():
    p = page(0, 2)
    state = {'cancel': False}
    stream_text, _ = streamer('Page.\n[[p1-i1]] 1. Repeated option >> One\n')
    def complete(**kwargs):
        state['cancel'] = True
        return fill_response([p.items[1]])
    events = run([p], stream_text, complete, cancelled=lambda: state['cancel'])
    assert events[-1]['type'] == 'cancelled'


def test_translation_call_uses_the_reading_resolution():
    p = page(0, 1)
    stream_text, calls = streamer(tagged(p.items))
    run([p], stream_text, image_detail='original')
    assert calls[0]['messages'][1]['content'][1]['image_url']['detail'] == 'original'
