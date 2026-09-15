# Deploy

## Coolify — نطاق الإنتاج `tkaful.alzaad.org.sa`

الترتيب الموصى به:

### 1) لوحة كولفاي
1. أنشئ **Project** جديد.
2. أضف مورد **PostgreSQL** واحفظ `DATABASE_URL`.
3. أضف **Application** من GitHub (`tkafulPlatform.zaad`).
4. Build Pack = **Dockerfile** (الملف في جذر المستودع). المنفذ المكشوف في كولفاي: **80** (مهم — وإلا Bad Gateway).
5. اربط النطاق `tkaful.alzaad.org.sa` وفعّل TLS.
6. الصورة تبني الواجهة ثم تشغّل gunicorn + nginx: `/` للواجهة و`/api/` للخادم. عند الإقلاع تُنفَّذ `migrate` و`create_admin` تلقائياً. فحص الصحة: `GET /health`.

### 2) متغيرات التطبيق
انسخ من [`deploy/.env.production.example`](deploy/.env.production.example) إلى Environment في كولفاي، مع استبدال:
- `SECRET_KEY` بمفتاح عشوائي طويل
- `DATABASE_URL` من مورد PostgreSQL
- `EMAIL_HOST_PASSWORD` بكلمة مرور تطبيق أوتلوك لحساب `tkaful@alzaad.org.sa`

**Build Arguments** (لا Runtime فقط — Vite يدمجها وقت البناء):
- `VITE_GOOGLE_MAPS_API_KEY` = مفتاح Google Maps JavaScript API (مقيّد بنطاق `tkaful.alzaad.org.sa`)

لا تفعّل `VITE_ENABLE_UAT` ولا `UAT_ENABLED` في الإنتاج. اترك `VITE_API_BASE_URL` فارغاً إذا الواجهة والـ API على نفس النطاق.
أضف `localhost,127.0.0.1` إلى `ALLOWED_HOSTS` واضبط `SECURE_SSL_REDIRECT=False`.

### 3) ثبات المرفقات بعد إعادة النشر
في كولفاي → Storage / Persistent Storage اربط مجلداً دائماً بالمسار داخل الحاوية:

```text
/app/backend/media
```

بدون هذا المجلد تُحذف الفواتير والمرفقات عند كل نشر جديد (قاعدة Postgres تبقى، والملفات تختفي).

### 4) قاعدة البيانات ومدير النظام
عند الإقلاع تُنفَّذ `migrate` و`create_admin`. لإعادة زرع/تحديث المشرف من طرفية الحاوية:

```bash
python manage.py create_admin --email td@alzaad.org.sa --username td --password '12341234'
```

أو عبر البيئة `ADMIN_EMAIL` / `ADMIN_USERNAME` / `ADMIN_PASSWORD` ثم `python manage.py create_admin`.

الدخول من الواجهة: **بريد + كلمة مرور فقط** (بدون OTP). OTP يبقى لتسجيل فرصة التطوع للضيف.

### 5) البريد (أوت لوك) — للإشعارات وOTP فرص التطوع
- المضيف: `smtp.office365.com` — المنفذ `587` — TLS مفعّل
- المستخدم / المرسل: `tkaful@alzaad.org.sa`

---

## Ubuntu VPS (first-time setup)

## المتطلبات

- Ubuntu 22.04+ LTS
- Domain/subdomain pointing to VPS (e.g. `tkaful.alzaad.org.sa`)
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
