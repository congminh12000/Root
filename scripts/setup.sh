#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
if [[ ! -x .venv/bin/python ]]; then
  if [[ -n "${ROOT_PYTHON:-}" ]]; then
    runtime="$ROOT_PYTHON"
  else
    runtime="$(command -v python3.12 || command -v python3.11 || command -v python3.10 || command -v python3.13 || command -v python3)"
  fi
  "$runtime" -c 'import sys; assert (3,10) <= sys.version_info[:2] <= (3,13), "Use Python 3.10–3.13 (3.12 recommended), set ROOT_PYTHON if needed"'
  "$runtime" -m venv .venv
fi
.venv/bin/python -m pip install -r requirements.lock.txt
cd web
npm ci
npm run build
echo "Ready. Run ./scripts/run.sh serve --host 0.0.0.0 from the project directory."
