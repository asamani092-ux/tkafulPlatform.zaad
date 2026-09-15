#!/bin/sh
set -eu

cd /app/backend

python - <<'PY'
import os, sys, time

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "takaful_backend.settings")
url = os.environ.get("DATABASE_URL", "")
if not url.startswith("postgres"):
    sys.exit(0)

import django
django.setup()
from django.db import connection
from django.db.utils import OperationalError

for i in range(30):
    try:
        connection.ensure_connection()
        print("database ready", flush=True)
        break
    except OperationalError as exc:
        print(f"waiting for database ({i + 1}/30): {exc}", flush=True)
        time.sleep(2)
else:
    sys.exit(1)
PY

python manage.py migrate --noinput
python manage.py collectstatic --noinput
python manage.py create_admin
chmod -R a+rX /app/backend/staticfiles /app/backend/media /usr/share/nginx/html

gunicorn takaful_backend.wsgi:application \
  --bind 127.0.0.1:8000 \
  --workers 3 \
  --timeout 120 \
  --access-logfile - \
  --error-logfile - &

for i in $(seq 1 40); do
  if curl -fsS http://127.0.0.1:8000/api/ping/ >/dev/null 2>&1; then
    break
  fi
  sleep 0.5
done

exec nginx -g "daemon off;"
