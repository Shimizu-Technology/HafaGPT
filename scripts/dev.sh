#!/usr/bin/env bash
set -euo pipefail

repository_root="$(cd "$(dirname "$0")/.." && pwd)"
api_python="${HAFAGPT_API_PYTHON:-$repository_root/api/.venv/bin/python}"
api_port="${API_PORT:-8000}"
web_port="${WEB_PORT:-5173}"

if [[ ! -x "$api_python" ]]; then
  api_python="python3"
fi

cleanup() {
  if [[ -n "${SHIMIZU_DEV_SESSION_ID:-}" ]] && command -v dev-lifecycle >/dev/null; then
    dev-lifecycle cleanup --session "$SHIMIZU_DEV_SESSION_ID" --execute
  else
    kill "${api_pid:-}" "${web_pid:-}" 2>/dev/null || true
  fi
}

trap cleanup EXIT INT TERM

if [[ "${HAFAGPT_SKIP_API:-0}" != "1" ]]; then
(
  cd "$repository_root/api"
  exec "$api_python" -m uvicorn api.main:app --reload --host 0.0.0.0 --port "$api_port"
) &
api_pid=$!
if [[ -n "${SHIMIZU_DEV_SESSION_ID:-}" ]]; then
  dev-lifecycle claim process "$api_pid" --session "$SHIMIZU_DEV_SESSION_ID" --reason "HåfaGPT API"
fi
fi

(
  cd "$repository_root/web"
  exec node "$repository_root/web/node_modules/vite/bin/vite.js" --host 127.0.0.1 --port "$web_port" --strictPort
) &
web_pid=$!
if [[ -n "${SHIMIZU_DEV_SESSION_ID:-}" ]]; then
  dev-lifecycle claim process "$web_pid" --session "$SHIMIZU_DEV_SESSION_ID" --reason "HåfaGPT web"
fi

echo "HåfaGPT web: http://localhost:$web_port"
echo "HåfaGPT API: http://localhost:$api_port"

wait ${api_pid:+"$api_pid"} "$web_pid"
