#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# Feed.io - PostgreSQL Disaster Recovery Restore Script
# Restores PostgreSQL database from a custom binary dump file (-Fc)
# ==============================================================================

BACKUP_FILE="${1:-}"
CONTAINER_NAME="${CONTAINER_NAME:-feedio-postgres}"
PG_USER="${POSTGRES_USER:-feedio_prod}"
PG_DB="${POSTGRES_DB:-feedio_prod}"

if [[ -z "$BACKUP_FILE" ]]; then
  echo "Usage: $0 <path-to-dump-file>" >&2
  echo "Example: $0 /var/lib/feedio/backups/feedio_postgres_latest.dump" >&2
  exit 1
fi

if [[ ! -f "$BACKUP_FILE" ]]; then
  echo "  [ERROR] Backup file not found: $BACKUP_FILE" >&2
  exit 1
fi

echo "=============================================================================="
echo "CRITICAL WARNING: DATABASE RESTORE IN PROGRESS"
echo "  - Dump file:   $BACKUP_FILE"
echo "  - Container:   $CONTAINER_NAME"
echo "  - Database:    $PG_DB (User: $PG_USER)"
echo "This operation will drop existing schemas and overwrite all current database data!"
echo "=============================================================================="

if [[ "${FORCE_RESTORE:-0}" != "1" ]]; then
  read -r -p "Are you sure you want to proceed with database restore? (type 'yes' to confirm): " CONFIRM
  if [[ "$CONFIRM" != "yes" ]]; then
    echo "Restore operation canceled."
    exit 0
  fi
fi

echo "==> Verifying status of container $CONTAINER_NAME..."
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
  echo "  [ERROR] Container $CONTAINER_NAME is not running!" >&2
  exit 1
fi

echo "==> Restoring database from $BACKUP_FILE..."
docker exec -i "$CONTAINER_NAME" pg_restore -U "$PG_USER" -d "$PG_DB" --clean --if-exists < "$BACKUP_FILE"

echo "==> [SUCCESS] Database restore completed successfully for database $PG_DB."
