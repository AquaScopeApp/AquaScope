#!/usr/bin/env bash
# safe_rebuild.sh — Rebuild and restart containers safely
#
# Backs up uploads + database before rebuilding so nothing is lost.
# Usage: ./scripts/safe_rebuild.sh [--no-cache]

set -euo pipefail
cd "$(dirname "$0")/.."

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_DIR="backups/pre-rebuild-${TIMESTAMP}"

echo "==> Creating pre-rebuild backup at ${BACKUP_DIR}/"
mkdir -p "${BACKUP_DIR}"

# Backup uploads (bind mount)
if [ -d data/uploads ]; then
  cp -R data/uploads "${BACKUP_DIR}/uploads"
  echo "    Uploads backed up ($(find data/uploads -type f | wc -l | tr -d ' ') files)"
else
  echo "    No uploads directory found — skipping"
fi

# Backup PostgreSQL database
echo "==> Dumping PostgreSQL database..."
docker compose exec -T postgres pg_dump -U "${POSTGRES_USER:-aquascope}" "${POSTGRES_DB:-aquascope}" \
  > "${BACKUP_DIR}/postgres.sql" 2>/dev/null && echo "    Database dumped" || echo "    Database dump skipped (container not running?)"

# Build
BUILD_ARGS=""
if [[ "${1:-}" == "--no-cache" ]]; then
  BUILD_ARGS="--no-cache"
  echo "==> Building with --no-cache"
fi

echo "==> Building containers..."
docker compose build ${BUILD_ARGS}

echo "==> Restarting containers..."
docker compose up -d

echo "==> Done! Backup saved to ${BACKUP_DIR}/"
echo "    Verify at http://localhost"
