#!/usr/bin/env bash
set -euo pipefail

git pull
docker compose up --build -d
