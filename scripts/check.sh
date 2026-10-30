#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
.venv/bin/ruff check backend
.venv/bin/pytest -q
cd web
npm run lint
npm test
npm run build
