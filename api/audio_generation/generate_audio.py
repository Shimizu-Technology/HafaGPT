#!/usr/bin/env python3
"""
Chamorro TTS Audio Generator

Generates pre-recorded audio files for Chamorro vocabulary using OpenAI TTS.
This ensures consistent pronunciation across the app.

Usage:
    python generate_audio.py --tier 1              # Generate Tier 1 (games/UI)
    python generate_audio.py --tier 1 --dry-run    # Preview without generating
    python generate_audio.py --word "Håfa Adai"    # Generate single word
    python generate_audio.py --upload              # Upload to S3 after generation
"""

import argparse
import json
import os
import re
import sys
from datetime import datetime
from pathlib import Path

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

# OpenAI TTS settings
TTS_MODEL = "tts-1"
TTS_VOICE = "shimmer"  # Best for Chamorro/Spanish sounds


def chamorro_to_phonetic(text: str) -> str:
    """
    Converts Chamorro text to a phonetic representation that OpenAI TTS
    can pronounce more accurately, based on Chamorro pronunciation rules.
    """
    processed_text = text
    
    # 1. Y = /dz/ (like "d" + "z" together)
    processed_text = re.sub(r'y', 'dz', processed_text, flags=re.IGNORECASE)
    
    # 2. CH = /ts/ (like "ts")
    processed_text = re.sub(r'ch', 'ts', processed_text, flags=re.IGNORECASE)
    
    # 3. Å = /ɑ/ (like "aw")
    processed_text = re.sub(r'å', 'aw', processed_text, flags=re.IGNORECASE)
    
    # 4. Ñ = /ɲ/ (like Spanish "ny")
    processed_text = re.sub(r'ñ', 'ny', processed_text, flags=re.IGNORECASE)
    
    # 5. Glottal Stop (') - add a slight pause or remove
    processed_text = processed_text.replace("'", "")
    
    return processed_text


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


def generate_audio(client: OpenAI, text: str, phonetic_hint: str = None) -> bytes:
    """Generate audio for a single word/phrase."""
    # Use phonetic hint if provided, otherwise apply automatic conversion
    text_to_speak = phonetic_hint if phonetic_hint else chamorro_to_phonetic(text)
    
    response = client.audio.speech.create(
        model=TTS_MODEL,
        voice=TTS_VOICE,
        input=text_to_speak,
    )
    
    return response.content


def generate_tier1(dry_run: bool = False, force: bool = False):
    """Generate audio for all Tier 1 words."""
    print("🔊 Generating Tier 1 Audio (Games + UI)")
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
    
    # Initialize OpenAI client
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        print("❌ OPENAI_API_KEY not found in environment")
        sys.exit(1)
    
    client = OpenAI(api_key=api_key)
    
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
            audio_data = generate_audio(client, chamorro, phonetic)
            
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
                "english": english,
                "category": category,
                "tier": 1,
                "phonetic_used": phonetic or chamorro_to_phonetic(chamorro),
                "size_bytes": len(audio_data),
                "generated_at": datetime.now().isoformat()
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


def generate_tier2(dry_run: bool = False, force: bool = False):
    """Generate audio for all Tier 2 words (core dictionary vocabulary)."""
    print("🔊 Generating Tier 2 Audio (Core Dictionary)")
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
    
    # Initialize OpenAI client
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        print("❌ OPENAI_API_KEY not found in environment")
        sys.exit(1)
    
    client = OpenAI(api_key=api_key)
    
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
            audio_data = generate_audio(client, chamorro, phonetic)
            
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
                "english": english,
                "category": category,
                "tier": 2,
                "phonetic_used": phonetic or chamorro_to_phonetic(chamorro),
                "size_bytes": len(audio_data),
                "generated_at": datetime.now().isoformat()
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


def generate_flashcards(dry_run: bool = False, force: bool = False):
    """Generate audio for curated flashcard words."""
    print("🔊 Generating Flashcard Audio")
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
    
    # Initialize OpenAI client
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        print("❌ OPENAI_API_KEY not found in environment")
        sys.exit(1)
    
    client = OpenAI(api_key=api_key)
    
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
            audio_data = generate_audio(client, chamorro, phonetic)
            
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
                "english": english,
                "category": category,
                "tier": "flashcards",
                "phonetic_used": phonetic or chamorro_to_phonetic(chamorro),
                "size_bytes": len(audio_data),
                "generated_at": datetime.now().isoformat()
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


def generate_single_word(word: str, phonetic: str = None):
    """Generate audio for a single word."""
    print(f"🔊 Generating audio for: {word}")
    
    AUDIO_DIR.mkdir(exist_ok=True)
    
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        print("❌ OPENAI_API_KEY not found in environment")
        sys.exit(1)
    
    client = OpenAI(api_key=api_key)
    manifest = load_manifest()
    
    filename = sanitize_filename(word)
    filepath = AUDIO_DIR / filename
    
    try:
        audio_data = generate_audio(client, word, phonetic)
        
        with open(filepath, 'wb') as f:
            f.write(audio_data)
        
        # Update manifest
        manifest["words"][word] = {
            "file": filename,
            "english": "(manual)",
            "category": "manual",
            "tier": 0,
            "phonetic_used": phonetic or chamorro_to_phonetic(word),
            "size_bytes": len(audio_data),
            "generated_at": datetime.now().isoformat()
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
        generate_single_word(args.word, args.phonetic)
    elif args.flashcards:
        generate_flashcards(dry_run=args.dry_run, force=args.force)
        if args.upload and not args.dry_run:
            upload_to_s3()
    elif args.tier == 1:
        generate_tier1(dry_run=args.dry_run, force=args.force)
        if args.upload and not args.dry_run:
            upload_to_s3()
    elif args.tier == 2:
        generate_tier2(dry_run=args.dry_run, force=args.force)
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

