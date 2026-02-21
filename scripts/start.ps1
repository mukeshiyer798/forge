# Start Forge App with Docker Compose (development)
$ErrorActionPreference = "Stop"
$ProjectDir = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectDir

# Create traefik-public network if it doesn't exist
docker network create traefik-public 2>$null

Write-Host "Starting Forge App stack..."
docker compose watch
