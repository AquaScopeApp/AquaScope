#!/bin/bash
# AquaScope Full Restore Script
#
# Restores from a backup archive created by backup.sh:
# 1. PostgreSQL database
# 2. InfluxDB data
# 3. All uploaded files
#
# Usage: ./scripts/restore.sh <backup_file.tar.gz>

set -e

if [ -z "$1" ]; then
  echo "Usage: $0 <backup_file.tar.gz>"
  exit 1
fi

ARCHIVE="$1"
if [ ! -f "$ARCHIVE" ]; then
  echo "Error: File not found: $ARCHIVE"
  exit 1
fi

# Configuration
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

if [ -f "$PROJECT_DIR/.env" ]; then
  set -a
  source "$PROJECT_DIR/.env"
  set +a
fi

POSTGRES_USER="${POSTGRES_USER:-reeflab}"
POSTGRES_DB="${POSTGRES_DB:-reeflab}"
INFLUXDB_ORG="${INFLUXDB_ORG:-reeflab}"
INFLUXDB_BUCKET="${INFLUXDB_BUCKET:-reef_parameters}"
INFLUXDB_TOKEN="${INFLUXDB_ADMIN_TOKEN:-my-super-secret-admin-token}"

# Extract to temp dir
TEMP_DIR=$(mktemp -d)
echo "=== AquaScope Restore ==="
echo "Archive: $ARCHIVE"
echo ""

echo "Extracting archive..."
tar xzf "$ARCHIVE" -C "$TEMP_DIR"
BACKUP_DIR=$(ls -d "$TEMP_DIR"/aquascope-backup-* 2>/dev/null | head -1)

if [ -z "$BACKUP_DIR" ]; then
  echo "Error: Invalid backup archive - no aquascope-backup-* directory found"
  rm -rf "$TEMP_DIR"
  exit 1
fi

# Show manifest
if [ -f "$BACKUP_DIR/manifest.json" ]; then
  echo ""
  echo "Backup manifest:"
  cat "$BACKUP_DIR/manifest.json" | python3 -m json.tool 2>/dev/null || cat "$BACKUP_DIR/manifest.json"
  echo ""
fi

# Confirm
read -p "This will REPLACE all current data. Continue? (yes/no): " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
  echo "Aborted."
  rm -rf "$TEMP_DIR"
  exit 0
fi

# Stop backend to prevent writes during restore
echo ""
echo "[1/4] Stopping backend..."
cd "$PROJECT_DIR"
docker compose stop backend 2>/dev/null || true

# Restore PostgreSQL
echo "[2/4] Restoring PostgreSQL..."
if [ -f "$BACKUP_DIR/postgres.sql" ]; then
  # Drop and recreate database
  docker exec aquascope-postgres psql -U "$POSTGRES_USER" -d postgres -c "
    SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$POSTGRES_DB' AND pid <> pg_backend_pid();
  " 2>/dev/null || true
  docker exec aquascope-postgres dropdb -U "$POSTGRES_USER" --if-exists "$POSTGRES_DB" 2>/dev/null || true
  docker exec aquascope-postgres createdb -U "$POSTGRES_USER" "$POSTGRES_DB"
  docker cp "$BACKUP_DIR/postgres.sql" aquascope-postgres:/tmp/restore.sql
  docker exec aquascope-postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f /tmp/restore.sql > /dev/null 2>&1
  docker exec aquascope-postgres rm /tmp/restore.sql
  echo "       PostgreSQL restored"
else
  echo "       WARNING: No postgres.sql found, skipping"
fi

# Restore InfluxDB
echo "[3/4] Restoring InfluxDB..."
if [ -d "$BACKUP_DIR/influxdb" ]; then
  docker cp "$BACKUP_DIR/influxdb" aquascope-influxdb:/tmp/influx-restore
  # Delete existing bucket data and restore
  docker exec aquascope-influxdb influx bucket delete \
    --name "$INFLUXDB_BUCKET" \
    --org "$INFLUXDB_ORG" \
    --token "$INFLUXDB_TOKEN" 2>/dev/null || true
  docker exec aquascope-influxdb influx restore /tmp/influx-restore \
    --org "$INFLUXDB_ORG" \
    --token "$INFLUXDB_TOKEN" \
    2>&1 | grep -v "^$" | sed 's/^/       /'
  docker exec aquascope-influxdb rm -rf /tmp/influx-restore
  echo "       InfluxDB restored"
else
  echo "       WARNING: No influxdb/ directory found, skipping"
fi

# Restore uploads
echo "[4/4] Restoring uploads..."
if [ -d "$BACKUP_DIR/uploads" ]; then
  # Clear existing uploads
  docker exec aquascope-backend rm -rf /app/uploads/* 2>/dev/null || true
  docker cp "$BACKUP_DIR/uploads/." aquascope-backend:/app/uploads/
  UPLOAD_COUNT=$(find "$BACKUP_DIR/uploads" -type f | wc -l | tr -d ' ')
  echo "       $UPLOAD_COUNT files restored"
else
  echo "       WARNING: No uploads/ directory found, skipping"
fi

# Restart services
echo ""
echo "Restarting services..."
docker compose up -d 2>/dev/null

# Cleanup
rm -rf "$TEMP_DIR"

echo ""
echo "=== Restore Complete ==="
echo "All data has been restored. Please verify by logging into the application."
