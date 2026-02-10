#!/bin/bash
# AquaScope Full Backup Script
#
# Creates a single .tar.gz archive containing:
# 1. PostgreSQL database dump
# 2. InfluxDB backup
# 3. All uploaded files (photos, tank images, ICP tests)
#
# Usage: ./scripts/backup.sh [output_directory]

set -e

# Configuration - read from .env or use defaults
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Source .env if it exists
if [ -f "$PROJECT_DIR/.env" ]; then
  set -a
  source "$PROJECT_DIR/.env"
  set +a
fi

POSTGRES_USER="${POSTGRES_USER:-reeflab}"
POSTGRES_DB="${POSTGRES_DB:-reeflab}"
INFLUXDB_ORG="${INFLUXDB_ORG:-reeflab}"
INFLUXDB_TOKEN="${INFLUXDB_ADMIN_TOKEN:-my-super-secret-admin-token}"

BACKUP_DIR="${1:-$PROJECT_DIR/backups}"
TIMESTAMP=$(date +%Y-%m-%d-%H%M%S)
BACKUP_NAME="aquascope-backup-$TIMESTAMP"
TEMP_DIR="$BACKUP_DIR/$BACKUP_NAME"

echo "=== AquaScope Backup ==="
echo "Timestamp: $TIMESTAMP"
echo "Output:    $BACKUP_DIR/$BACKUP_NAME.tar.gz"
echo ""

# Create directories
mkdir -p "$TEMP_DIR"

# 1. PostgreSQL dump
echo "[1/4] Dumping PostgreSQL..."
docker exec aquascope-postgres pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" > "$TEMP_DIR/postgres.sql"
PG_SIZE=$(wc -c < "$TEMP_DIR/postgres.sql" | tr -d ' ')
echo "       Done ($PG_SIZE bytes)"

# 2. InfluxDB backup
echo "[2/4] Backing up InfluxDB..."
docker exec aquascope-influxdb rm -rf /tmp/influx-backup 2>/dev/null || true
docker exec aquascope-influxdb influx backup /tmp/influx-backup \
  --org "$INFLUXDB_ORG" \
  --token "$INFLUXDB_TOKEN" \
  2>&1 | grep -v "^$" | sed 's/^/       /'
docker cp aquascope-influxdb:/tmp/influx-backup "$TEMP_DIR/influxdb"
docker exec aquascope-influxdb rm -rf /tmp/influx-backup
INFLUX_FILES=$(find "$TEMP_DIR/influxdb" -type f | wc -l | tr -d ' ')
echo "       Done ($INFLUX_FILES files)"

# 3. Upload files
echo "[3/4] Copying upload files..."
docker cp aquascope-backend:/app/uploads "$TEMP_DIR/uploads" 2>/dev/null || mkdir -p "$TEMP_DIR/uploads"
UPLOAD_COUNT=$(find "$TEMP_DIR/uploads" -type f | wc -l | tr -d ' ')
UPLOAD_SIZE=$(du -sh "$TEMP_DIR/uploads" 2>/dev/null | cut -f1)
echo "       Done ($UPLOAD_COUNT files, $UPLOAD_SIZE)"

# 4. Generate manifest
echo "[4/4] Generating manifest..."
PG_USERS=$(docker exec aquascope-postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "SELECT count(*) FROM users;" 2>/dev/null | tr -d ' ')
PG_TANKS=$(docker exec aquascope-postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "SELECT count(*) FROM tanks;" 2>/dev/null | tr -d ' ')
PG_PHOTOS=$(docker exec aquascope-postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "SELECT count(*) FROM photos;" 2>/dev/null | tr -d ' ')
PG_NOTES=$(docker exec aquascope-postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "SELECT count(*) FROM notes;" 2>/dev/null | tr -d ' ')
PG_LIVESTOCK=$(docker exec aquascope-postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "SELECT count(*) FROM livestock;" 2>/dev/null | tr -d ' ')

cat > "$TEMP_DIR/manifest.json" << EOF
{
  "app": "AquaScope",
  "backup_date": "$TIMESTAMP",
  "postgres_user": "$POSTGRES_USER",
  "postgres_db": "$POSTGRES_DB",
  "influxdb_org": "$INFLUXDB_ORG",
  "counts": {
    "users": $PG_USERS,
    "tanks": $PG_TANKS,
    "photos": $PG_PHOTOS,
    "notes": $PG_NOTES,
    "livestock": $PG_LIVESTOCK,
    "upload_files": $UPLOAD_COUNT
  }
}
EOF

# Create archive
echo ""
echo "Compressing..."
cd "$BACKUP_DIR"
tar czf "$BACKUP_NAME.tar.gz" "$BACKUP_NAME"
rm -rf "$TEMP_DIR"

ARCHIVE_SIZE=$(du -sh "$BACKUP_DIR/$BACKUP_NAME.tar.gz" | cut -f1)
echo ""
echo "=== Backup Complete ==="
echo "Archive: $BACKUP_DIR/$BACKUP_NAME.tar.gz ($ARCHIVE_SIZE)"
echo "Contents: $PG_USERS users, $PG_TANKS tanks, $UPLOAD_COUNT files"
