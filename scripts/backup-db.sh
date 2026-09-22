#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# Feed.io - PostgreSQL Production Backup Script
# Creates a compressed custom binary dump (-Fc) and rotates backups older than 30 days
# ==============================================================================

BACKUP_DIR="${BACKUP_DIR:-/var/lib/feedio/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
CONTAINER_NAME="${CONTAINER_NAME:-feedio-postgres}"
PG_USER="${POSTGRES_USER:-feedio_prod}"
PG_DB="${POSTGRES_DB:-feedio_prod}"

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/feedio_postgres_${TIMESTAMP}.dump"
LATEST_LINK="${BACKUP_DIR}/feedio_postgres_latest.dump"

echo "==> [$(date '+%Y-%m-%d %H:%M:%S')] Starting backup of database $PG_DB from container $CONTAINER_NAME..."

if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
  echo "  [ERROR] Container $CONTAINER_NAME is not currently running!" >&2
  exit 1
fi

docker exec "$CONTAINER_NAME" pg_dump -U "$PG_USER" -Fc "$PG_DB" > "$BACKUP_FILE"

FILE_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "==> [SUCCESS] Created backup file: $BACKUP_FILE ($FILE_SIZE)"

# Update symlink to latest backup
ln -sf "$BACKUP_FILE" "$LATEST_LINK"

# Clean up older backups
echo "==> Checking and purging backups older than $RETENTION_DAYS days..."
DELETED_COUNT=$(find "$BACKUP_DIR" -maxdepth 1 -name "feedio_postgres_*.dump" -type f -mtime +"$RETENTION_DAYS" -print -delete | wc -l || true)
echo "==> Deleted $DELETED_COUNT expired backup(s)."
echo "==> Backup procedure completed successfully."
