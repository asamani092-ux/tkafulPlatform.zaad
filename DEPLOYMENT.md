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
