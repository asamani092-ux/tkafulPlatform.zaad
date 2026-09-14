# Deploy — Ubuntu VPS (first-time setup)

## المتطلبات

- Ubuntu 22.04+ LTS
- Domain/subdomain pointing to VPS (e.g. `app.client.org`)
- Git, Python 3.11+, Node 20+, PostgreSQL 15+, Nginx, Certbot

## 1. System packages

```bash
sudo apt update && sudo apt install -y git python3-venv python3-pip nginx postgresql postgresql-contrib certbot python3-certbot-nginx
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

## 2. PostgreSQL

```bash
sudo -u postgres psql -c "CREATE USER takaful WITH PASSWORD 'strong-password';"
sudo -u postgres psql -c "CREATE DATABASE takaful OWNER takaful;"
```

## 3. Clone & configure

```bash
sudo mkdir -p /var/www/takaful && sudo chown $USER:$USER /var/www/takaful
git clone https://github.com/asamani092-ux/tkafulPlatform.zaad.git /var/www/takaful
cd /var/www/takaful
cp deploy/.env.production.example backend/.env
# Edit backend/.env — SECRET_KEY, DATABASE_URL, ALLOWED_HOSTS, EXTERNAL_STORE_URL, etc.
```

## 4. First deploy

```bash
chmod +x deploy/deploy.sh
./deploy/deploy.sh
```

## 5. Nginx + TLS

```bash
sudo cp deploy/nginx.conf.template /etc/nginx/sites-available/takaful
# Replace SUBDOMAIN and paths in the template
sudo ln -s /etc/nginx/sites-available/takaful /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d app.client.org
```

## 6. Gunicorn systemd

```bash
sudo cp deploy/gunicorn.service /etc/systemd/system/takaful-gunicorn.service
# Adjust User/WorkingDirectory if needed
sudo systemctl daemon-reload
sudo systemctl enable --now takaful-gunicorn
```

## 6.5 Post-migrate sync (نظام الخرائط)

هجرة البيانات `maps.0002` تنسخ بيانات `impact_map` الموجودة **لحظة تشغيلها**.
إذا بُذرت/استُوردت بيانات `impact_map` بعد `migrate` (أو وصلت لاحقاً من أي مصدر)،
شغّل المزامنة الـ idempotent التالية — آمنة لإعادة التشغيل ولا تكرّر صفوفاً:

```bash
cd /var/www/takaful/backend
./venv/bin/python manage.py sync_impact_map_to_maps
# للتحقق من سلامة الأعداد بعد المزامنة:
./venv/bin/python manage.py check_migration_integrity --expect migrated
```

ملاحظة: `seed_impact_map` يستدعي `sync_impact_map_to_maps` تلقائياً في نهايته،
فسير العمل الافتراضي `migrate` → `seed_impact_map` مغطّى دون خطوة إضافية.

## 7. Daily backup (cron)

```bash
chmod +x deploy/backup-postgres.sh
crontab -e
# Add: 0 2 * * * /var/www/takaful/deploy/backup-postgres.sh >> /var/log/takaful-backup.log 2>&1
```

## Restore from backup

```bash
gunzip -c /var/backups/takaful/takaful_YYYYMMDD_HHMMSS.sql.gz | psql "$DATABASE_URL"
```

## Architecture

```
Browser → Nginx (TLS)
  /     → frontend/dist (static SPA)
  /api/ → Gunicorn → Django
  private media → Django authenticated view (X-Accel-Redirect optional)
```

## Updates

```bash
cd /var/www/takaful && ./deploy/deploy.sh
```

## Removing the evaluation form before production

The internal acceptance evaluation form (`/uat` and `GET /api/uat/`) is for test
environments only. It must be fully absent from production.

- Do **not** set `VITE_ENABLE_UAT` or `UAT_ENABLED` in production (defaults keep
  both off).
- Frontend: build without the flag, then verify the bundle has no UAT component:

  ```bash
  cd frontend
  npm run build && npm run assert:no-uat
  ```

  With the flag unset, `/uat` is not registered and falls through to the SPA 404.
- Backend: `GET /api/uat/` returns **404** by default (`UAT_ENABLED` false). Only
  enable it in a dedicated test env if you need the status probe.
