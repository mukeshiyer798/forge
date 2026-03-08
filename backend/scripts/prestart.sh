#! /usr/bin/env bash

set -e
set -x

# In Docker, WORKDIR is set to /app/backend/ in the Dockerfile
# Ensure we can see the 'app' module
ls -d app

# Let the DB start
python app/backend_pre_start.py

# Run migrations
alembic upgrade head

# Create initial data in DB
python app/initial_data.py
