import pytest
from api import audio_synthesis as speech


class AudioResponse:
    status_code = 200
    headers = {"Content-Type": "audio/mpeg"}
    def __enter__(self): return self
    def __exit__(self, *args): return False
    def iter_content(self, size): return iter([b"ID3" + b"audio" * 300])


def test_v4_keeps_original_orthography_and_english_and_records_exact_request(monkeypatch):
    monkeypatch.setenv("ELEVENLABS_API_KEY", "test-only")
    monkeypatch.setenv("ELEVENLABS_VOICE_ID", "shared_voice")
    calls = []
    monkeypatch.setattr(speech.requests, "post", lambda *args, **kwargs: (calls.append((args, kwargs)) or AudioResponse()))
    text = "Håfa adai. Try this phrase."
    audio, provenance = speech.generate_speech(text, model="eleven_v4")
    assert audio.startswith(b"ID3")
    assert calls[0][1]["json"] == {"text": text, "model_id": "eleven_v4"}
    assert calls[0][1]["timeout"] == (3.0, 60.0)
    assert provenance["input_text"] == text
    assert provenance["voice_id"] == "shared_voice"


def test_ipa_is_explicit_and_cannot_silently_run_on_legacy_model():
    assert speech.synthesis_input("test", "eleven_v4", "ipa", "/ˈtɛst/") == "/ˈtɛst/"
    with pytest.raises(ValueError, match="require Eleven v4"):
        speech.synthesis_input("test", "eleven_multilingual_v2", "ipa", "ˈtɛst")
    for value in ["", "[laugh]", "<phoneme>", "one/two", "one\ntwo"]:
        with pytest.raises(ValueError): speech.synthesis_input("test", "eleven_v4", "ipa", value)


def test_upstream_details_and_non_audio_success_are_not_exposed(monkeypatch):
    monkeypatch.setenv("ELEVENLABS_API_KEY", "test-only")
    response = AudioResponse()
    response.status_code = 401
    response.text = "private account detail"
    monkeypatch.setattr(speech.requests, "post", lambda *args, **kwargs: response)
    with pytest.raises(speech.SpeechGenerationError) as error:
        speech.generate_speech("test", model="eleven_v4")
    assert "private" not in str(error.value)
    response.status_code = 200
    response.headers = {"Content-Type": "application/json"}
    with pytest.raises(speech.SpeechGenerationError, match="invalid audio"):
        speech.generate_speech("test", model="eleven_v4")


def test_oversized_response_stops_reading_and_unknown_model_never_calls_provider(monkeypatch):
    monkeypatch.setenv("ELEVENLABS_API_KEY", "test-only")
    response = AudioResponse()
    response.iter_content = lambda size: iter([b"ID3", b"x" * (speech.MAX_AUDIO_BYTES + 1)])
    monkeypatch.setattr(speech.requests, "post", lambda *args, **kwargs: response)
    with pytest.raises(speech.SpeechGenerationError, match="5 MB"):
        speech.generate_speech("test", model="eleven_v4")
    monkeypatch.setattr(speech.requests, "post", lambda *args, **kwargs: pytest.fail("must validate before request"))
    with pytest.raises(ValueError): speech.generate_speech("test", model="invented")


def test_live_v4_missing_key_fallback_restores_the_requested_hint(monkeypatch):
    import ast, asyncio, base64, logging, os, time
    from pathlib import Path
    from types import SimpleNamespace
    from fastapi import HTTPException
    import openai
    source = Path(__file__).parents[1] / 'api/main.py'
    node = next(node for node in ast.parse(source.read_text()).body if isinstance(node, ast.AsyncFunctionDef) and node.name=='text_to_speech')
    node.decorator_list=[]
    namespace={'__package__':'api','Request':object,'Form':lambda *args,**kwargs:kwargs.get('default'),
        'HTTPException':HTTPException,'logger':logging.getLogger('audio-test'),'check_tts_rate_limit':lambda ip:True,
        'get_pronunciation':lambda text:'explicit-test-hint','asyncio':asyncio,'base64':base64,'os':os,'time':time}
    exec(compile(ast.Module(body=[node],type_ignores=[]),str(source),'exec'),namespace)
    captured=[]
    def create(**kwargs): captured.append(kwargs); return SimpleNamespace(content=b'ID3audio')
    monkeypatch.setattr(openai,'OpenAI',lambda **kwargs:SimpleNamespace(audio=SimpleNamespace(speech=SimpleNamespace(create=create))))
    monkeypatch.setenv('ELEVENLABS_LIVE_MODEL','eleven_v4');monkeypatch.delenv('ELEVENLABS_API_KEY',raising=False);monkeypatch.setenv('OPENAI_API_KEY','test-only')
    asyncio.run(namespace['text_to_speech'](SimpleNamespace(client=SimpleNamespace(host='127.0.0.1')),text='test',voice='shimmer',phonetic=True,provider='elevenlabs'))
    assert captured[0]['input']=='explicit-test-hint'


def test_batch_direct_execution_can_import_the_shared_adapter(monkeypatch):
    import runpy, sys
    from pathlib import Path
    from types import SimpleNamespace
    monkeypatch.setitem(sys.modules,'api.audio_synthesis',SimpleNamespace(generate_speech=lambda *args,**kwargs:(b'ID3fixture',{})))
    script=Path(__file__).parents[1]/'audio_generation/generate_audio.py'
    namespace=runpy.run_path(str(script))
    assert namespace['generate_audio_elevenlabs']('test')==b'ID3fixture'
