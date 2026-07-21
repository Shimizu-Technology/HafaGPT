#!/usr/bin/env bash
set -euo pipefail

repository_root="$(cd "$(dirname "$0")/.." && pwd)"
api_python="${HAFAGPT_API_PYTHON:-$repository_root/api/.venv/bin/python}"

if [[ ! -x "$api_python" ]]; then
  api_python="python3"
fi

cleanup() {
  kill "${api_pid:-}" "${web_pid:-}" 2>/dev/null || true
}

trap cleanup EXIT INT TERM

(
  cd "$repository_root/api"
  exec "$api_python" -m uvicorn api.main:app --reload --host 0.0.0.0 --port 8000
) &
api_pid=$!

(
  cd "$repository_root/web"
  exec npm run dev
) &
web_pid=$!

echo "HåfaGPT web: http://localhost:5173"
echo "HåfaGPT API: http://localhost:8000"

wait "$api_pid" "$web_pid"
