#!/usr/bin/env bash
# نسخة احتياطية كاملة لقاعدة البيانات قبل هجرة إعادة الهيكلة (خطوة إلزامية).
# يدعم SQLite (نسخ ملف) و PostgreSQL (تفويض إلى backup-postgres.sh / pg_dump).
#
# الاستخدام:
#   ./deploy/backup.sh                 # يحفظ في /var/backups/takaful أو $BACKUP_DIR
#   BACKUP_DIR=/tmp/bk ./deploy/backup.sh
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

if [ -n "${DATABASE_URL:-}" ]; then
  OUT="${BACKUP_DIR}/takaful_${STAMP}.sql.gz"
  pg_dump "$DATABASE_URL" | gzip > "$OUT"
else
  SQLITE_DB="${ROOT}/backend/db.sqlite3"
  if [ ! -f "$SQLITE_DB" ]; then
    echo "No DATABASE_URL and no SQLite db at ${SQLITE_DB} — nothing to back up." >&2
    exit 1
  fi
  OUT="${BACKUP_DIR}/takaful_sqlite_${STAMP}.db.gz"
  # نسخ متسق عبر أمر .backup في sqlite3 إن وُجد، وإلا نسخ الملف مباشرة
  if command -v sqlite3 >/dev/null 2>&1; then
    TMP="$(mktemp)"
    sqlite3 "$SQLITE_DB" ".backup '$TMP'"
    gzip -c "$TMP" > "$OUT"
    rm -f "$TMP"
  else
    gzip -c "$SQLITE_DB" > "$OUT"
  fi
fi

find "$BACKUP_DIR" -name 'takaful_*' -mtime +14 -delete
echo "Backup saved: $OUT"
