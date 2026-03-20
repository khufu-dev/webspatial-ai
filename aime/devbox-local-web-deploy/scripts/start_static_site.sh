#!/usr/bin/env bash
set -euo pipefail

DIR="${1:-}"
PORT="${2:-8080}"

if [[ -z "${DIR}" ]]; then
  echo "Usage: $0 <directory> [port]" >&2
  exit 2
fi

if [[ ! -d "${DIR}" ]]; then
  echo "Directory not found: ${DIR}" >&2
  exit 2
fi

cd "${DIR}"

if [[ ! -f "index.html" ]]; then
  echo "Warning: index.html not found under ${DIR}. The server will still run, but the site may not be a SPA." >&2
fi

echo "Serving ${DIR} on http://0.0.0.0:${PORT}/"
exec python3 -m http.server "${PORT}" --bind 0.0.0.0
