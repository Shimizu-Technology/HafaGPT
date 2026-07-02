#!/usr/bin/env python3
"""Verify HåfaGPT static audio manifests and optional S3 assets.

Default mode is offline and deterministic: it validates the API manifest and,
when present, checks that the frontend public manifest is an exact copy. Network
checks are opt-in with --remote-manifest and --remote-audio.
"""

from __future__ import annotations

import argparse
import json
import sys
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass
from pathlib import Path
from typing import Any

API_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_MANIFEST = API_ROOT / "audio_generation" / "manifest.json"
DEFAULT_FRONTEND_MANIFEST = API_ROOT.parent / "HafaGPT-frontend" / "public" / "audio_manifest.json"
DEFAULT_REMOTE_MANIFEST_URL = "https://hafagpt.s3.ap-southeast-2.amazonaws.com/audio/manifest.json"
DEFAULT_AUDIO_BASE_URL = "https://hafagpt.s3.ap-southeast-2.amazonaws.com/audio"

REQUIRED_TERMS = {
    "Hunggan",
    "Åhe'",
    "Maolek ha' yu'",
    "Atgun sumångan ennåo",
    "Nihi ta hånåo",
    "Kao guaha?",
    "Håfa bidåda-mu?",
    "Nengkanno'",
}

BLOCKED_STALE_TERMS = {
    "Buen prubechu",
    "Buenas tatdes",
    "Buenas yan hågu",
    "Bula",
    "Fan hånao hit",
    "Gris",
    "Hafa bidå-mu?",
    "Håfa na bidå-mu?",
    "Kanai",
    "Kao guåha?",
    "Kao siña un tulaika?",
    "Kulot kafe",
    "Kulot kahel",
    "Kulot rosa",
    "Kuåttro",
    "Kådu",
    "Lalala",
    "Lechuga",
    "Mata",
    "Månha",
    "Na'fåna i kanai-mu!",
    "Nengkånno'",
    "Nuebe",
    "Påtti i mata-mu!",
    "Påtti i tata'ao-mu!",
    "Påtti i ulo-mu!",
    "Rosa",
    "Siette",
    "Singko",
    "Sinku",
    "Såksan",
    "Tata'ao",
    "Ulo",
    "Uno",
    "Åttelong",
}

REQUIRED_ENTRY_FIELDS = {
    "file",
    "url",
    "english",
    "category",
    "tier",
    "phonetic_used",
    "size_bytes",
    "generated_at",
}

AUDIO_CONTENT_TYPES = {
    "audio/mpeg",
    "audio/mp3",
    "application/octet-stream",
    "binary/octet-stream",
}


@dataclass(frozen=True)
class Finding:
    severity: str
    message: str


def load_manifest(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        data = json.load(handle)
    if not isinstance(data, dict):
        raise ValueError(f"{path} is not a JSON object")
    return data


def add_error(findings: list[Finding], message: str) -> None:
    findings.append(Finding("error", message))


def expected_url(file_name: str, audio_base_url: str = DEFAULT_AUDIO_BASE_URL) -> str:
    return f"{audio_base_url.rstrip('/')}/{file_name}"


def has_control_whitespace(value: str) -> bool:
    return any(character in value for character in "\r\n\t")


def validate_manifest(
    manifest: dict[str, Any],
    *,
    label: str,
    required_terms: set[str] | None = None,
    blocked_terms: set[str] | None = None,
    audio_base_url: str = DEFAULT_AUDIO_BASE_URL,
) -> list[Finding]:
    """Return validation findings for a static audio manifest."""
    findings: list[Finding] = []
    words = manifest.get("words")
    if not isinstance(words, dict):
        return [Finding("error", f"{label}: missing object field 'words'")]

    total_words = manifest.get("total_words")
    if total_words != len(words):
        add_error(findings, f"{label}: total_words={total_words!r} but words has {len(words)} entries")

    required_terms = REQUIRED_TERMS if required_terms is None else required_terms
    missing_required = sorted(required_terms - set(words))
    for term in missing_required:
        add_error(findings, f"{label}: required term missing from manifest: {term}")

    blocked_terms = BLOCKED_STALE_TERMS if blocked_terms is None else blocked_terms
    present_blocked = sorted(blocked_terms & set(words))
    for term in present_blocked:
        add_error(findings, f"{label}: blocked stale teaching key still present: {term}")

    for term, raw_entry in words.items():
        if has_control_whitespace(term):
            add_error(findings, f"{label}: term contains control whitespace: {term!r}")
        if not isinstance(raw_entry, dict):
            add_error(findings, f"{label}: entry for {term!r} is not an object")
            continue
        entry = raw_entry
        missing_fields = sorted(REQUIRED_ENTRY_FIELDS - set(entry))
        if missing_fields:
            add_error(findings, f"{label}: entry for {term!r} is missing fields: {', '.join(missing_fields)}")
            continue

        file_name = entry.get("file")
        if not isinstance(file_name, str) or not file_name.endswith(".mp3") or "/" in file_name or any(ch.isspace() for ch in file_name):
            add_error(findings, f"{label}: entry for {term!r} has invalid file name: {file_name!r}")

        url = entry.get("url")
        if isinstance(file_name, str) and isinstance(url, str):
            if has_control_whitespace(url):
                add_error(findings, f"{label}: entry for {term!r} url contains control whitespace: {url!r}")
            expected = expected_url(file_name, audio_base_url)
            if url != expected:
                add_error(findings, f"{label}: entry for {term!r} url mismatch: expected {expected}, got {url}")
        else:
            add_error(findings, f"{label}: entry for {term!r} has invalid url: {url!r}")

        size_bytes = entry.get("size_bytes")
        if not isinstance(size_bytes, int) or size_bytes <= 0:
            add_error(findings, f"{label}: entry for {term!r} has invalid size_bytes: {size_bytes!r}")

        alias_of = entry.get("alias_of")
        if alias_of is not None:
            if alias_of not in words:
                add_error(findings, f"{label}: alias {term!r} points to missing canonical term {alias_of!r}")
            elif entry.get("file") != words[alias_of].get("file") and not entry.get("compatibility_note"):
                add_error(findings, f"{label}: alias {term!r} has its own file but no compatibility_note explaining why")

    return findings


def compare_manifests(primary: dict[str, Any], secondary: dict[str, Any], *, primary_label: str, secondary_label: str) -> list[Finding]:
    """Return findings when two manifests have different words/metadata."""
    findings: list[Finding] = []
    primary_words = primary.get("words", {})
    secondary_words = secondary.get("words", {})
    if not isinstance(primary_words, dict) or not isinstance(secondary_words, dict):
        return [Finding("error", f"Cannot compare {primary_label} and {secondary_label}: invalid words object")]

    primary_terms = set(primary_words)
    secondary_terms = set(secondary_words)
    missing = sorted(primary_terms - secondary_terms)
    extra = sorted(secondary_terms - primary_terms)
    if missing:
        add_error(findings, f"{secondary_label}: missing {len(missing)} terms from {primary_label}: {', '.join(missing[:12])}{' ...' if len(missing) > 12 else ''}")
    if extra:
        add_error(findings, f"{secondary_label}: has {len(extra)} extra terms not in {primary_label}: {', '.join(extra[:12])}{' ...' if len(extra) > 12 else ''}")

    differing = sorted(term for term in primary_terms & secondary_terms if primary_words[term] != secondary_words[term])
    if differing:
        add_error(findings, f"{secondary_label}: {len(differing)} shared terms differ from {primary_label}: {', '.join(differing[:12])}{' ...' if len(differing) > 12 else ''}")

    if primary.get("total_words") != secondary.get("total_words"):
        add_error(findings, f"{secondary_label}: total_words={secondary.get('total_words')!r} differs from {primary_label} total_words={primary.get('total_words')!r}")

    return findings


def fetch_json(url: str, *, timeout: float) -> dict[str, Any]:
    request = urllib.request.Request(url, headers={"Accept": "application/json"})
    with urllib.request.urlopen(request, timeout=timeout) as response:
        payload = response.read()
    data = json.loads(payload.decode("utf-8"))
    if not isinstance(data, dict):
        raise ValueError(f"Remote JSON at {url} is not an object")
    return data


def fetch_remote_manifest(url: str, *, timeout: float) -> tuple[dict[str, Any] | None, Finding | None]:
    try:
        return fetch_json(url, timeout=timeout), None
    except Exception as exc:
        return None, Finding("error", f"{url}: failed to fetch remote manifest: {exc}")


def head_audio(url: str, expected_size: int | None, *, timeout: float, retries: int = 2) -> Finding | None:
    last_error: Finding | None = None
    for _attempt in range(retries + 1):
        request = urllib.request.Request(url, method="HEAD")
        try:
            with urllib.request.urlopen(request, timeout=timeout) as response:
                status = getattr(response, "status", None)
                content_type = (response.headers.get("Content-Type") or "").split(";", 1)[0].strip().lower()
                content_length = response.headers.get("Content-Length")
            break
        except urllib.error.HTTPError as exc:
            last_error = Finding("error", f"{url}: HTTP {exc.code}")
        except urllib.error.URLError as exc:
            last_error = Finding("error", f"{url}: {exc.reason}")
        except TimeoutError:
            last_error = Finding("error", f"{url}: timed out")
        except Exception as exc:
            last_error = Finding("error", f"{url}: {exc}")
    else:
        return last_error

    if status and status >= 400:
        return Finding("error", f"{url}: HTTP {status}")
    if content_type and content_type not in AUDIO_CONTENT_TYPES:
        return Finding("error", f"{url}: unexpected content type {content_type!r}")

    parsed_content_length: int | None = None
    if content_length:
        try:
            parsed_content_length = int(content_length)
        except ValueError:
            return Finding("error", f"{url}: invalid Content-Length {content_length!r}")

    if expected_size is not None and parsed_content_length is not None and parsed_content_length != expected_size:
        return Finding("error", f"{url}: Content-Length {content_length} differs from manifest size_bytes {expected_size}")
    return None


def verify_remote_audio_files(manifest: dict[str, Any], *, timeout: float, workers: int) -> list[Finding]:
    words = manifest.get("words", {})
    urls_by_file: dict[str, tuple[str, int | None]] = {}
    for entry in words.values():
        if not isinstance(entry, dict):
            continue
        file_name = entry.get("file")
        url = entry.get("url")
        if isinstance(file_name, str) and isinstance(url, str) and file_name not in urls_by_file:
            size = entry.get("size_bytes")
            urls_by_file[file_name] = (url, size if isinstance(size, int) else None)

    findings: list[Finding] = []
    with ThreadPoolExecutor(max_workers=max(1, workers)) as executor:
        futures = [executor.submit(head_audio, url, size, timeout=timeout) for url, size in urls_by_file.values()]
        for future in as_completed(futures):
            finding = future.result()
            if finding:
                findings.append(finding)
    return sorted(findings, key=lambda item: item.message)


def print_findings(findings: list[Finding]) -> None:
    for finding in findings:
        prefix = "❌" if finding.severity == "error" else "⚠️"
        print(f"{prefix} {finding.message}")


def main() -> int:
    parser = argparse.ArgumentParser(description="Verify HåfaGPT static audio manifests and optional S3 assets.")
    parser.add_argument("--manifest", type=Path, default=DEFAULT_MANIFEST, help="API/local manifest path")
    parser.add_argument("--frontend-manifest", type=Path, default=DEFAULT_FRONTEND_MANIFEST, help="Frontend public manifest path")
    parser.add_argument("--skip-frontend", action="store_true", help="Do not compare the frontend public manifest")
    parser.add_argument("--remote-manifest", action="store_true", help="Fetch and compare the remote S3 manifest")
    parser.add_argument("--remote-manifest-url", default=DEFAULT_REMOTE_MANIFEST_URL, help="Remote manifest URL")
    parser.add_argument("--remote-audio", action="store_true", help="HEAD-check every unique audio file URL in the manifest")
    parser.add_argument("--timeout", type=float, default=10.0, help="Network timeout in seconds")
    parser.add_argument("--workers", type=int, default=16, help="Concurrent workers for --remote-audio")
    args = parser.parse_args()

    findings: list[Finding] = []
    manifest = load_manifest(args.manifest)
    findings.extend(validate_manifest(manifest, label=str(args.manifest)))

    if not args.skip_frontend:
        if args.frontend_manifest.exists():
            frontend_manifest = load_manifest(args.frontend_manifest)
            findings.extend(validate_manifest(frontend_manifest, label=str(args.frontend_manifest)))
            findings.extend(
                compare_manifests(
                    manifest,
                    frontend_manifest,
                    primary_label=str(args.manifest),
                    secondary_label=str(args.frontend_manifest),
                )
            )
        else:
            print(f"ℹ️  Frontend manifest not found; skipped: {args.frontend_manifest}")

    if args.remote_manifest:
        remote_manifest, remote_manifest_finding = fetch_remote_manifest(
            args.remote_manifest_url,
            timeout=args.timeout,
        )
        if remote_manifest_finding:
            findings.append(remote_manifest_finding)
        elif remote_manifest is not None:
            findings.extend(validate_manifest(remote_manifest, label=args.remote_manifest_url))
            findings.extend(
                compare_manifests(
                    manifest,
                    remote_manifest,
                    primary_label=str(args.manifest),
                    secondary_label=args.remote_manifest_url,
                )
            )

    if args.remote_audio:
        findings.extend(verify_remote_audio_files(manifest, timeout=args.timeout, workers=args.workers))

    if findings:
        print_findings(findings)
        print(f"Static audio manifest verification failed: {len(findings)} finding(s)")
        return 1

    print(f"✅ Static audio manifest OK: {args.manifest} ({manifest.get('total_words')} words)")
    if not args.skip_frontend and args.frontend_manifest.exists():
        print(f"✅ Frontend manifest matches: {args.frontend_manifest}")
    if args.remote_manifest:
        print(f"✅ Remote manifest matches: {args.remote_manifest_url}")
    if args.remote_audio:
        print("✅ Remote audio files verified")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
