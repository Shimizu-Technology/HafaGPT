#!/usr/bin/env bash
set -euo pipefail

repository_root="$(cd "$(dirname "$0")/.." && pwd)"
api_python="${HAFAGPT_API_PYTHON:-$repository_root/api/.venv/bin/python}"

if [[ ! -x "$api_python" ]]; then
  api_python="python3"
fi

(
  cd "$repository_root/api"
  PYTEST_DISABLE_PLUGIN_AUTOLOAD=1 "$api_python" -m pytest -q tests
  "$api_python" scripts/validate_canonical_vocabulary.py --api-root .
  PYTHONPATH=. "$api_python" scripts/validate_governed_sources.py
  PYTHONPATH=. "$api_python" scripts/run_source_routing_benchmark.py
  "$api_python" scripts/check_language_content_against_canonical.py --api-root .
  "$api_python" scripts/verify_static_audio_manifest.py
)

(
  cd "$repository_root/web"
  npm run lint
  npm run typecheck
  npm run build
)
