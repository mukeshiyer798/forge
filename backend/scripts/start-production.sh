#!/usr/bin/env bash
# Production startup: run DB migrations + seed, then start the server.
# Used by Railway (and any platform that runs a single container).
set -e
set -x

# Ensure we're in the backend workdir
cd /app/backend

echo "==> Running pre-start checks and migrations..."
bash scripts/prestart.sh

echo "==> Starting FastAPI server..."
exec fastapi run --workers 4 app/main.py
