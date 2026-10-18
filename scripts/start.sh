#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
if [ ! -x .venv/bin/python ]; then
  if command -v uv >/dev/null 2>&1; then
    uv venv --python 3.12 .venv
    uv pip install --python .venv/bin/python -r requirements.txt
  else
    if ! command -v python3.12 >/dev/null 2>&1; then
      echo '需要 Python 3.12 或 uv。请先安装其中之一，再重新启动。'
      exit 1
    fi
    python3.12 -m venv .venv
    .venv/bin/python -m pip install -r requirements.txt
  fi
fi
if [ ! -f .env ]; then cp .env.example .env; fi
if [ ! -f web/assets/slacking_senior.webp ]; then .venv/bin/python scripts/prepare_assets.py; fi
exec .venv/bin/python -m uvicorn app.main:app --host "${HOST:-0.0.0.0}" --port "${PORT:-8000}" --no-access-log
