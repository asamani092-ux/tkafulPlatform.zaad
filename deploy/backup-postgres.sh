#!/usr/bin/env bash
# Daily PostgreSQL backup — add to cron: 0 2 * * *
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${ROOT}/backend/.env"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/takaful}"
STAMP="$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

if [ -f "$ENV_FILE" ]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

: "${DATABASE_URL:?DATABASE_URL must be set in backend/.env}"

OUT="${BACKUP_DIR}/takaful_${STAMP}.sql.gz"
pg_dump "$DATABASE_URL" | gzip > "$OUT"
find "$BACKUP_DIR" -name 'takaful_*.sql.gz' -mtime +14 -delete
echo "Backup saved: $OUT"
