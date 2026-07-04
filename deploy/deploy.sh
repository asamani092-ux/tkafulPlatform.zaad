#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> git pull"
git pull origin "$(git branch --show-current)"

echo "==> backend: venv + deps"
cd backend
python3 -m venv venv 2>/dev/null || true
./venv/bin/pip install -q -r requirements.txt

echo "==> migrate + collectstatic"
./venv/bin/python manage.py migrate --noinput
./venv/bin/python manage.py collectstatic --noinput

echo "==> frontend build"
cd ../frontend
npm ci
npm run build

echo "==> restart gunicorn"
sudo systemctl restart takaful-gunicorn || echo "Restart gunicorn manually if not using systemd"

echo "Deploy complete."
