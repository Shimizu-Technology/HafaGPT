"""Shared, explicit synthesis inputs for live speech and reviewed audio candidates."""

import os
import re

import requests

ELEVEN_MODELS = {"eleven_v4", "eleven_multilingual_v2"}
MAX_AUDIO_BYTES = 5 * 1024 * 1024


class SpeechGenerationError(RuntimeError):
    """Safe error text suitable for the admin interface."""


def eleven_voice_id() -> str:
    voice = os.getenv("ELEVENLABS_VOICE_ID") or "EXAVITQu4vr4xnSDxMaL"
    if not re.fullmatch(r"[A-Za-z0-9_-]{1,100}", voice):
        raise SpeechGenerationError("The configured ElevenLabs voice is invalid.")
    return voice


def synthesis_input(text: str, model: str, input_mode: str, pronunciation: str | None) -> str:
    if not isinstance(text, str) or not text.strip() or len(text) > 4096:
        raise ValueError("Enter between 1 and 4,096 characters.")
    if input_mode == "original":
        return text
    if input_mode not in {"ipa", "respelling"}:
        raise ValueError("Choose original spelling, IPA, or a pronunciation hint.")
    if not isinstance(pronunciation, str) or not pronunciation.strip() or len(pronunciation) > 4096:
        raise ValueError("Enter a pronunciation for this candidate.")
    if input_mode == "ipa":
        if model != "eleven_v4":
            raise ValueError("IPA candidates require Eleven v4.")
        value = pronunciation.strip().strip("/").strip()
        if not value or any(char in value for char in "<>[]\n\r/"):
            raise ValueError("Enter only the IPA transcription, without delivery tags.")
        return f"/{value}/"
    return pronunciation.strip()


def generate_speech(
    text: str, *, provider: str = "elevenlabs", model: str | None = None,
    input_mode: str = "original", pronunciation: str | None = None,
    timeout: tuple[float, float] = (3.0, 60.0),
) -> tuple[bytes, dict]:
    """Generate without implicit respelling, fallback, or publication side effects."""
    if provider not in {"elevenlabs", "openai"}:
        raise ValueError("Choose ElevenLabs or OpenAI.")
    model = model or (os.getenv("ELEVENLABS_MODEL") or "eleven_multilingual_v2" if provider == "elevenlabs" else "tts-1")
    if (provider == "elevenlabs" and model not in ELEVEN_MODELS) or (provider == "openai" and model != "tts-1"):
        raise ValueError("This speech model is not supported.")
    processed = synthesis_input(text, model, input_mode, pronunciation)
    settings = {}
    if provider == "elevenlabs":
        key = os.getenv("ELEVENLABS_API_KEY")
        if not key:
            raise SpeechGenerationError("ElevenLabs is not configured. Ask the site administrator to check its API key.")
        voice = eleven_voice_id()
        if model == "eleven_multilingual_v2":
            settings = {"stability": 0.85, "similarity_boost": 0.75, "style": 0.0, "use_speaker_boost": True}
        payload = {"text": processed, "model_id": model}
        if settings:
            payload["voice_settings"] = settings
        try:
            with requests.post(
                f"https://api.elevenlabs.io/v1/text-to-speech/{voice}",
                params={"output_format": "mp3_44100_128"},
                headers={"xi-api-key": key, "Accept": "audio/mpeg"},
                json=payload, timeout=timeout, stream=True,
            ) as response:
                if response.status_code != 200:
                    raise SpeechGenerationError("ElevenLabs could not generate this candidate. Check model access and available credits, then retry.")
                content_type = response.headers.get("Content-Type", "").lower()
                if "audio/" not in content_type and "octet-stream" not in content_type:
                    raise SpeechGenerationError("ElevenLabs returned an invalid audio response.")
                chunks, length = [], 0
                for chunk in response.iter_content(65536):
                    length += len(chunk)
                    if length > MAX_AUDIO_BYTES:
                        raise SpeechGenerationError("Generated audio exceeded the 5 MB limit.")
                    chunks.append(chunk)
                audio = b"".join(chunks)
        except requests.RequestException as error:
            raise SpeechGenerationError("ElevenLabs could not be reached. Please retry.") from error
    else:
        from openai import OpenAI, OpenAIError
        voice = os.getenv("OPENAI_TTS_VOICE") or "shimmer"
        if not os.getenv("OPENAI_API_KEY"):
            raise SpeechGenerationError("OpenAI speech is not configured.")
        try:
            audio = OpenAI(timeout=sum(timeout), max_retries=0).audio.speech.create(
                model=model, voice=voice, input=processed,
            ).content
        except OpenAIError as error:
            raise SpeechGenerationError("OpenAI could not generate this candidate. Please retry.") from error
    if not audio or len(audio) > MAX_AUDIO_BYTES:
        raise SpeechGenerationError("The provider returned empty or oversized audio.")
    if not (audio.startswith(b"ID3") or (len(audio) > 1 and audio[0] == 0xFF and audio[1] & 0xE0 == 0xE0)):
        raise SpeechGenerationError("The provider did not return playable MP3 audio.")
    return audio, {"provider": provider, "model": model, "voice_id": voice,
                   "input_mode": input_mode, "input_text": processed, "settings": settings}
