#!/usr/bin/env python3
"""
Chamorro TTS Audio Generator

Generates pre-recorded audio files for Chamorro vocabulary using OpenAI or ElevenLabs TTS.
This ensures consistent pronunciation across the app.

Usage:
    python generate_audio.py --tier 1              # Generate Tier 1 (games/UI)
    python generate_audio.py --tier 1 --dry-run    # Preview without generating
    python generate_audio.py --word "Håfa Adai"    # Generate single word
    python generate_audio.py --upload              # Upload to S3 after generation
    python generate_audio.py --provider elevenlabs # Use ElevenLabs instead of OpenAI
"""

import argparse
import json
import os
import re
import sys
from datetime import datetime
from pathlib import Path

import requests
from dotenv import load_dotenv
from openai import OpenAI

# Load environment variables
load_dotenv()

# Constants
BASE_DIR = Path(__file__).parent
AUDIO_DIR = BASE_DIR / "audio_files"
MANIFEST_PATH = BASE_DIR / "manifest.json"
TIER1_PATH = BASE_DIR / "tier1_words.json"
TIER2_PATH = BASE_DIR / "tier2_words.json"
FLASHCARD_PATH = BASE_DIR / "flashcard_words.json"
PRONUNCIATION_DICT_PATH = BASE_DIR / "chamorro_pronunciations.json"

# S3 settings
S3_BUCKET = os.getenv("AWS_S3_BUCKET", "hafagpt")
S3_REGION = os.getenv("AWS_REGION", "ap-southeast-2")
S3_BASE_URL = f"https://{S3_BUCKET}.s3.{S3_REGION}.amazonaws.com/audio"

# TTS Provider settings
TTS_PROVIDER = os.getenv("TTS_PROVIDER", "elevenlabs")  # "elevenlabs" or "openai"

# OpenAI TTS settings
OPENAI_TTS_MODEL = "tts-1"
OPENAI_TTS_VOICE = "shimmer"  # Best for Chamorro/Spanish sounds

# ElevenLabs TTS settings
ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY")
ELEVENLABS_VOICE_ID = os.getenv("ELEVENLABS_VOICE_ID", "EXAVITQu4vr4xnSDxMaL")  # "Sarah" - clear female voice
ELEVENLABS_MODEL = "eleven_multilingual_v2"  # Best for non-English languages


def load_pronunciation_dictionary() -> dict:
    """Load custom Chamorro pronunciation dictionary."""
    if PRONUNCIATION_DICT_PATH.exists():
        with open(PRONUNCIATION_DICT_PATH, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {}


def get_pronunciation(word: str, phonetic_hint: str = None) -> str:
    """
    Get the pronunciation for a word.
    Priority: 1) Explicit phonetic_hint, 2) Pronunciation dictionary, 3) Auto-conversion
    """
    if phonetic_hint:
        return phonetic_hint
    
    # Check pronunciation dictionary
    pron_dict = load_pronunciation_dictionary()
    if word in pron_dict:
        return pron_dict[word]
    
    # Fall back to automatic conversion (for OpenAI)
    return chamorro_to_phonetic(word)


def chamorro_to_phonetic(text: str) -> str:
    """
    Converts Chamorro text to a phonetic representation that OpenAI TTS
    can pronounce more accurately, based on Chamorro pronunciation rules.
    
    Key Chamorro sounds:
    - Y sounds like "dz" (hayi → hadzi)
    - CH sounds like "ts" (chocho → tsotso)
    - Å sounds like "aw" in "saw"
    - Ñ sounds like Spanish "ny"
    - Glottal stop (') is a brief pause
    - All vowels are pure Spanish-style (a=ah, e=eh, i=ee, o=oh, u=oo)
    """
    result = text
    
    # ===== STEP 1: Mark NG to preserve it (will restore later) =====
    result = re.sub(r'ng', 'NGMARKER', result, flags=re.IGNORECASE)
    
    # ===== STEP 2: Handle Chamorro consonant sounds =====
    
    # CH → TS (case-insensitive, preserve case of first letter)
    def replace_ch(m):
        return 'Ts' if m.group(0)[0].isupper() else 'ts'
    result = re.sub(r'ch', replace_ch, result, flags=re.IGNORECASE)
    
    # Y → DZ (Chamorro Y is voiced like "dz")
    def replace_y(m):
        return 'Dz' if m.group(0).isupper() else 'dz'
    result = re.sub(r'y', replace_y, result, flags=re.IGNORECASE)
    
    # ===== STEP 3: Handle Chamorro special letters =====
    
    # Å → AW (the ringed A)
    result = result.replace('å', 'aw')
    result = result.replace('Å', 'Aw')
    
    # Ñ → NY
    result = result.replace('ñ', 'ny')
    result = result.replace('Ñ', 'Ny')
    
    # Glottal stop → small pause (comma helps TTS pause slightly)
    result = result.replace("'", ",")
    
    # ===== STEP 4: Restore NG =====
    result = result.replace('NGMARKER', 'ng')
    
    # ===== STEP 5: Add pronunciation hints for clearer vowels =====
    # Only apply to isolated vowel sounds that TTS might mispronounce
    
    # Final 'i' should be "ee" (Chamorro "i" = Spanish "i" = "ee")
    result = re.sub(r'i\b', 'ee', result, flags=re.IGNORECASE)
    
    # ===== STEP 6: Clean up =====
    result = re.sub(r'\s+', ' ', result)
    result = re.sub(r',\s*$', '', result)  # Remove trailing comma
    result = result.strip()
    
    return result


def sanitize_filename(text: str) -> str:
    """Convert Chamorro text to a safe filename."""
    # Remove special characters and replace spaces
    filename = text.lower()
    filename = filename.replace("'", "")
    filename = filename.replace("å", "a")
    filename = filename.replace("ñ", "n")
    filename = re.sub(r'[^a-z0-9\s]', '', filename)
    filename = filename.replace(" ", "_")
    return filename + ".mp3"


def load_manifest() -> dict:
    """Load the current manifest."""
    if MANIFEST_PATH.exists():
        with open(MANIFEST_PATH, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {
        "version": 1,
        "last_updated": None,
        "total_words": 0,
        "words": {}
    }


def save_manifest(manifest: dict):
    """Save the manifest."""
    manifest["last_updated"] = datetime.now().isoformat()
    manifest["total_words"] = len(manifest["words"])
    with open(MANIFEST_PATH, 'w', encoding='utf-8') as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)
    print(f"✅ Manifest saved: {manifest['total_words']} words")


def load_tier1_words() -> list:
    """Load Tier 1 words from JSON file."""
    with open(TIER1_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    words = []
    for category_id, category in data["categories"].items():
        for word in category["words"]:
            words.append({
                "chamorro": word["chamorro"],
                "english": word["english"],
                "phonetic_hint": word.get("phonetic_hint"),
                "category": category_id
            })
    return words


def load_tier2_words() -> list:
    """Load Tier 2 words from JSON file."""
    if not TIER2_PATH.exists():
        print(f"❌ Tier 2 words file not found: {TIER2_PATH}")
        print("   Run: python -m audio_generation.extract_tier2_words --max 500")
        return []
    
    with open(TIER2_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    words = []
    for category_id, category in data.get("categories", {}).items():
        for word in category.get("words", []):
            words.append({
                "chamorro": word["chamorro"],
                "english": word["english"],
                "phonetic_hint": word.get("phonetic_hint"),
                "category": category_id
            })
    return words


def load_flashcard_words() -> list:
    """Load flashcard words from JSON file."""
    if not FLASHCARD_PATH.exists():
        print(f"❌ Flashcard words file not found: {FLASHCARD_PATH}")
        print("   Run: python -m audio_generation.extract_flashcard_words")
        return []
    
    with open(FLASHCARD_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    words = []
    for category_id, category in data.get("categories", {}).items():
        for word in category.get("words", []):
            words.append({
                "chamorro": word["chamorro"],
                "english": word["english"],
                "phonetic_hint": word.get("phonetic_hint"),
                "category": "flashcards"
            })
    return words


def generate_audio_openai(client: OpenAI, text: str, phonetic_hint: str = None) -> bytes:
    """Generate audio using OpenAI TTS."""
    # Use get_pronunciation which checks: 1) hint, 2) dictionary, 3) auto-conversion
    text_to_speak = get_pronunciation(text, phonetic_hint)
    
    response = client.audio.speech.create(
        model=OPENAI_TTS_MODEL,
        voice=OPENAI_TTS_VOICE,
        input=text_to_speak,
    )
    
    return response.content


def generate_audio_elevenlabs(text: str, phonetic_hint: str = None) -> bytes:
    """Generate audio using ElevenLabs TTS."""
    if not ELEVENLABS_API_KEY:
        raise ValueError("ELEVENLABS_API_KEY not set in environment")
    
    # Get pronunciation from: 1) hint, 2) dictionary, 3) original text
    # For ElevenLabs, we prefer the pronunciation dictionary but don't apply auto-conversion
    # because ElevenLabs handles pronunciation better with its multilingual model
    if phonetic_hint:
        text_to_speak = phonetic_hint
    else:
        # Check pronunciation dictionary first
        pron_dict = load_pronunciation_dictionary()
        if text in pron_dict:
            text_to_speak = pron_dict[text]
        else:
            # Use original text (ElevenLabs multilingual handles it well)
            text_to_speak = text
    
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{ELEVENLABS_VOICE_ID}"
    
    headers = {
        "Accept": "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": ELEVENLABS_API_KEY
    }
    
    data = {
        "text": text_to_speak,
        "model_id": ELEVENLABS_MODEL,
        "voice_settings": {
            "stability": 0.85,        # Higher = more consistent
            "similarity_boost": 0.75,  # Balance between clarity and naturalness
            "style": 0.0,             # No style exaggeration
            "use_speaker_boost": True  # Improve clarity
        }
    }
    
    response = requests.post(url, json=data, headers=headers)
    
    if response.status_code != 200:
        raise Exception(f"ElevenLabs API error: {response.status_code} - {response.text}")
    
    return response.content


def generate_audio(text: str, phonetic_hint: str = None, provider: str = None, openai_client: OpenAI = None) -> bytes:
    """Generate audio using the configured TTS provider."""
    provider = provider or TTS_PROVIDER
    
    if provider == "elevenlabs":
        return generate_audio_elevenlabs(text, phonetic_hint)
    else:
        # OpenAI (default)
        if openai_client is None:
            openai_client = OpenAI()
        return generate_audio_openai(openai_client, text, phonetic_hint)


def generate_tier1(dry_run: bool = False, force: bool = False, provider: str = None):
    """Generate audio for all Tier 1 words."""
    provider = provider or TTS_PROVIDER
    print(f"🔊 Generating Tier 1 Audio (Games + UI) using {provider.upper()}")
    print("=" * 50)
    
    # Ensure output directory exists
    AUDIO_DIR.mkdir(exist_ok=True)
    
    # Load existing manifest and words
    manifest = load_manifest()
    words = load_tier1_words()
    
    print(f"📋 Found {len(words)} words in Tier 1")
    
    # Filter out already generated words (unless force)
    if not force:
        new_words = [w for w in words if w["chamorro"] not in manifest["words"]]
        skipped = len(words) - len(new_words)
        if skipped > 0:
            print(f"⏭️  Skipping {skipped} already generated words")
        words = new_words
    
    if not words:
        print("✅ All words already generated!")
        return
    
    print(f"🎯 Will generate {len(words)} new words")
    
    if dry_run:
        print("\n📝 DRY RUN - Words that would be generated:")
        for word in words:
            phonetic = word["phonetic_hint"] or chamorro_to_phonetic(word["chamorro"])
            print(f"  - {word['chamorro']} ({word['english']}) → \"{phonetic}\"")
        return
    
    # Validate API keys
    if provider == "elevenlabs":
        if not ELEVENLABS_API_KEY:
            print("❌ ELEVENLABS_API_KEY not found in environment")
            sys.exit(1)
        openai_client = None
    else:
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            print("❌ OPENAI_API_KEY not found in environment")
            sys.exit(1)
        openai_client = OpenAI(api_key=api_key)
    
    # Generate audio for each word
    success_count = 0
    error_count = 0
    
    for i, word in enumerate(words, 1):
        chamorro = word["chamorro"]
        english = word["english"]
        phonetic = word["phonetic_hint"]
        category = word["category"]
        filename = sanitize_filename(chamorro)
        filepath = AUDIO_DIR / filename
        
        print(f"[{i}/{len(words)}] Generating: {chamorro} ({english})...", end=" ")
        
        try:
            audio_data = generate_audio(chamorro, phonetic, provider, openai_client)
            
            # Validate audio (check minimum size)
            if len(audio_data) < 1000:  # Less than 1KB is suspicious
                print(f"⚠️  Audio too small ({len(audio_data)} bytes)")
                error_count += 1
                continue
            
            # Save audio file
            with open(filepath, 'wb') as f:
                f.write(audio_data)
            
            # Update manifest
            manifest["words"][chamorro] = {
                "file": filename,
                "url": f"{S3_BASE_URL}/{filename}",
                "english": english,
                "category": category,
                "tier": 1,
                "phonetic_used": phonetic or chamorro,
                "size_bytes": len(audio_data),
                "generated_at": datetime.now().isoformat(),
                "tts_provider": provider,
                "review_status": "needs_review"
            }
            
            print(f"✅ ({len(audio_data)} bytes)")
            success_count += 1
            
        except Exception as e:
            print(f"❌ Error: {e}")
            error_count += 1
    
    # Save manifest
    save_manifest(manifest)
    
    print("\n" + "=" * 50)
    print(f"🎉 Generation complete!")
    print(f"   ✅ Success: {success_count}")
    print(f"   ❌ Errors: {error_count}")
    print(f"   📁 Audio files: {AUDIO_DIR}")


def generate_tier2(dry_run: bool = False, force: bool = False, provider: str = None):
    """Generate audio for all Tier 2 words (core dictionary vocabulary)."""
    provider = provider or TTS_PROVIDER
    print(f"🔊 Generating Tier 2 Audio (Core Dictionary) using {provider.upper()}")
    print("=" * 50)
    
    # Ensure output directory exists
    AUDIO_DIR.mkdir(exist_ok=True)
    
    # Load existing manifest and words
    manifest = load_manifest()
    words = load_tier2_words()
    
    if not words:
        return
    
    print(f"📋 Found {len(words)} words in Tier 2")
    
    # Filter out already generated words (unless force)
    if not force:
        new_words = [w for w in words if w["chamorro"] not in manifest["words"]]
        skipped = len(words) - len(new_words)
        if skipped > 0:
            print(f"⏭️  Skipping {skipped} already generated words")
        words = new_words
    
    if not words:
        print("✅ All words already generated!")
        return
    
    print(f"🎯 Will generate {len(words)} new words")
    
    if dry_run:
        print("\n📝 DRY RUN - Words that would be generated:")
        for word in words[:20]:  # Show first 20 only
            phonetic = word["phonetic_hint"] or chamorro_to_phonetic(word["chamorro"])
            print(f"  - {word['chamorro']} ({word['english']}) → \"{phonetic}\"")
        if len(words) > 20:
            print(f"  ... and {len(words) - 20} more")
        return
    
    # Validate API keys
    if provider == "elevenlabs":
        if not ELEVENLABS_API_KEY:
            print("❌ ELEVENLABS_API_KEY not found in environment")
            sys.exit(1)
        openai_client = None
    else:
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            print("❌ OPENAI_API_KEY not found in environment")
            sys.exit(1)
        openai_client = OpenAI(api_key=api_key)
    
    # Generate audio for each word
    success_count = 0
    error_count = 0
    
    for i, word in enumerate(words, 1):
        chamorro = word["chamorro"]
        english = word["english"]
        phonetic = word["phonetic_hint"]
        category = word["category"]
        filename = sanitize_filename(chamorro)
        filepath = AUDIO_DIR / filename
        
        print(f"[{i}/{len(words)}] Generating: {chamorro} ({english})...", end=" ", flush=True)
        
        try:
            audio_data = generate_audio(chamorro, phonetic, provider, openai_client)
            
            # Validate audio (check minimum size)
            if len(audio_data) < 1000:  # Less than 1KB is suspicious
                print(f"⚠️  Audio too small ({len(audio_data)} bytes)")
                error_count += 1
                continue
            
            # Save audio file
            with open(filepath, 'wb') as f:
                f.write(audio_data)
            
            # Update manifest
            manifest["words"][chamorro] = {
                "file": filename,
                "url": f"{S3_BASE_URL}/{filename}",
                "english": english,
                "category": category,
                "tier": 2,
                "phonetic_used": phonetic or chamorro,
                "size_bytes": len(audio_data),
                "generated_at": datetime.now().isoformat(),
                "tts_provider": provider,
                "review_status": "needs_review"
            }
            
            print(f"✅ ({len(audio_data)} bytes)")
            success_count += 1
            
        except Exception as e:
            print(f"❌ Error: {e}")
            error_count += 1
        
        # Save manifest periodically (every 50 words)
        if i % 50 == 0:
            save_manifest(manifest)
            print(f"   💾 Progress saved ({i}/{len(words)})")
    
    # Final save
    save_manifest(manifest)
    
    print("\n" + "=" * 50)
    print(f"🎉 Tier 2 Generation complete!")
    print(f"   ✅ Success: {success_count}")
    print(f"   ❌ Errors: {error_count}")
    print(f"   📁 Audio files: {AUDIO_DIR}")


def generate_flashcards(dry_run: bool = False, force: bool = False, provider: str = None):
    """Generate audio for curated flashcard words."""
    provider = provider or TTS_PROVIDER
    print(f"🔊 Generating Flashcard Audio using {provider.upper()}")
    print("=" * 50)
    
    # Ensure output directory exists
    AUDIO_DIR.mkdir(exist_ok=True)
    
    # Load existing manifest and words
    manifest = load_manifest()
    words = load_flashcard_words()
    
    if not words:
        return
    
    print(f"📋 Found {len(words)} flashcard words")
    
    # Filter out already generated words (unless force)
    if not force:
        new_words = [w for w in words if w["chamorro"] not in manifest["words"]]
        skipped = len(words) - len(new_words)
        if skipped > 0:
            print(f"⏭️  Skipping {skipped} already generated words")
        words = new_words
    
    if not words:
        print("✅ All words already generated!")
        return
    
    print(f"🎯 Will generate {len(words)} new words")
    
    if dry_run:
        print("\n📝 DRY RUN - Words that would be generated:")
        for word in words[:20]:
            phonetic = word["phonetic_hint"] or chamorro_to_phonetic(word["chamorro"])
            print(f"  - {word['chamorro']} ({word['english']}) → \"{phonetic}\"")
        if len(words) > 20:
            print(f"  ... and {len(words) - 20} more")
        return
    
    # Validate API keys
    if provider == "elevenlabs":
        if not ELEVENLABS_API_KEY:
            print("❌ ELEVENLABS_API_KEY not found in environment")
            sys.exit(1)
        openai_client = None
    else:
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            print("❌ OPENAI_API_KEY not found in environment")
            sys.exit(1)
        openai_client = OpenAI(api_key=api_key)
    
    # Generate audio for each word
    success_count = 0
    error_count = 0
    
    for i, word in enumerate(words, 1):
        chamorro = word["chamorro"]
        english = word["english"]
        phonetic = word["phonetic_hint"]
        category = word["category"]
        filename = sanitize_filename(chamorro)
        filepath = AUDIO_DIR / filename
        
        print(f"[{i}/{len(words)}] Generating: {chamorro} ({english})...", end=" ", flush=True)
        
        try:
            audio_data = generate_audio(chamorro, phonetic, provider, openai_client)
            
            # Validate audio
            if len(audio_data) < 1000:
                print(f"⚠️  Audio too small ({len(audio_data)} bytes)")
                error_count += 1
                continue
            
            # Save audio file
            with open(filepath, 'wb') as f:
                f.write(audio_data)
            
            # Update manifest
            manifest["words"][chamorro] = {
                "file": filename,
                "url": f"{S3_BASE_URL}/{filename}",
                "english": english,
                "category": category,
                "tier": "flashcards",
                "phonetic_used": phonetic or chamorro,
                "size_bytes": len(audio_data),
                "generated_at": datetime.now().isoformat(),
                "tts_provider": provider,
                "review_status": "needs_review"
            }
            
            print(f"✅ ({len(audio_data)} bytes)")
            success_count += 1
            
        except Exception as e:
            print(f"❌ Error: {e}")
            error_count += 1
        
        # Save manifest periodically
        if i % 25 == 0:
            save_manifest(manifest)
            print(f"   💾 Progress saved ({i}/{len(words)})")
    
    # Final save
    save_manifest(manifest)
    
    print("\n" + "=" * 50)
    print(f"🎉 Flashcard Generation complete!")
    print(f"   ✅ Success: {success_count}")
    print(f"   ❌ Errors: {error_count}")
    print(f"   📁 Audio files: {AUDIO_DIR}")


def generate_single_word(word: str, phonetic: str = None, provider: str = None):
    """Generate audio for a single word."""
    provider = provider or TTS_PROVIDER
    print(f"🔊 Generating audio for: {word} using {provider.upper()}")
    
    AUDIO_DIR.mkdir(exist_ok=True)
    
    # Validate API key based on provider
    if provider == "elevenlabs":
        if not ELEVENLABS_API_KEY:
            print("❌ ELEVENLABS_API_KEY not found in environment")
            sys.exit(1)
        openai_client = None
    else:
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            print("❌ OPENAI_API_KEY not found in environment")
            sys.exit(1)
        openai_client = OpenAI(api_key=api_key)
    
    manifest = load_manifest()
    
    filename = sanitize_filename(word)
    filepath = AUDIO_DIR / filename
    
    try:
        audio_data = generate_audio(word, phonetic, provider, openai_client)
        
        with open(filepath, 'wb') as f:
            f.write(audio_data)
        
        # Update manifest
        manifest["words"][word] = {
            "file": filename,
            "url": f"{S3_BASE_URL}/{filename}",
            "english": "(manual)",
            "category": "manual",
            "tier": 0,
            "phonetic_used": phonetic or word,  # For ElevenLabs, we use the word directly
            "size_bytes": len(audio_data),
            "generated_at": datetime.now().isoformat(),
            "tts_provider": provider,
            "review_status": "needs_review"
        }
        
        save_manifest(manifest)
        
        print(f"✅ Saved: {filepath} ({len(audio_data)} bytes)")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)


def upload_to_s3():
    """Upload generated audio files to S3."""
    print("📤 Uploading to S3...")
    
    try:
        import boto3
    except ImportError:
        print("❌ boto3 not installed. Run: pip install boto3")
        sys.exit(1)
    
    bucket = os.getenv("AWS_S3_BUCKET", "hafagpt")
    
    s3 = boto3.client(
        's3',
        aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
        aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
    )
    
    manifest = load_manifest()
    audio_files = list(AUDIO_DIR.glob("*.mp3"))
    
    print(f"📁 Found {len(audio_files)} audio files")
    
    uploaded = 0
    for filepath in audio_files:
        key = f"audio/{filepath.name}"
        try:
            s3.upload_file(
                str(filepath),
                bucket,
                key,
                ExtraArgs={'ContentType': 'audio/mpeg'}
            )
            print(f"  ✅ Uploaded: {key}")
            uploaded += 1
        except Exception as e:
            print(f"  ❌ Failed: {key} - {e}")
    
    # Upload manifest
    try:
        s3.upload_file(
            str(MANIFEST_PATH),
            bucket,
            "audio/manifest.json",
            ExtraArgs={'ContentType': 'application/json'}
        )
        print("  ✅ Uploaded: audio/manifest.json")
    except Exception as e:
        print(f"  ❌ Failed: audio/manifest.json - {e}")
    
    print(f"\n🎉 Uploaded {uploaded} files to s3://{bucket}/audio/")


def main():
    parser = argparse.ArgumentParser(description="Generate Chamorro TTS audio files")
    parser.add_argument("--tier", type=int, choices=[1, 2, 3], help="Generate tier (1=games, 2=dictionary, 3=stories)")
    parser.add_argument("--flashcards", action="store_true", help="Generate curated flashcard words")
    parser.add_argument("--word", type=str, help="Generate single word")
    parser.add_argument("--phonetic", type=str, help="Phonetic hint for single word")
    parser.add_argument("--dry-run", action="store_true", help="Preview without generating")
    parser.add_argument("--force", action="store_true", help="Regenerate all (ignore manifest)")
    parser.add_argument("--upload", action="store_true", help="Upload to S3 after generation")
    parser.add_argument("--list", action="store_true", help="List all generated words")
    parser.add_argument("--provider", type=str, choices=["openai", "elevenlabs"], 
                        default=TTS_PROVIDER, help="TTS provider to use")
    
    args = parser.parse_args()
    
    if args.list:
        manifest = load_manifest()
        print(f"📋 Generated words: {manifest['total_words']}")
        for word, info in manifest["words"].items():
            print(f"  - {word} ({info['english']}) [{info['category']}]")
        return
    
    # Handle standalone upload (--upload without --tier)
    if args.upload and not args.tier and not args.word:
        upload_to_s3()
        return
    
    if args.word:
        generate_single_word(args.word, args.phonetic, provider=args.provider)
    elif args.flashcards:
        generate_flashcards(dry_run=args.dry_run, force=args.force, provider=args.provider)
        if args.upload and not args.dry_run:
            upload_to_s3()
    elif args.tier == 1:
        generate_tier1(dry_run=args.dry_run, force=args.force, provider=args.provider)
        if args.upload and not args.dry_run:
            upload_to_s3()
    elif args.tier == 2:
        generate_tier2(dry_run=args.dry_run, force=args.force, provider=args.provider)
        if args.upload and not args.dry_run:
            upload_to_s3()
    elif args.tier == 3:
        print(f"❌ Tier 3 not yet implemented")
        sys.exit(1)
    else:
        parser.print_help()
        return


if __name__ == "__main__":
    main()

