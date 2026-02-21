#!/usr/bin/env bash
# Start Forge App with Docker Compose (development)
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

# Create traefik-public network if it doesn't exist (for compose.yml)
docker network create traefik-public 2>/dev/null || true

echo "Starting Forge App stack..."
docker compose watch
