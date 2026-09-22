# إنتاج Coolify: واجهة Vite + Django/Gunicorn خلف Nginx على المنفذ 80
FROM node:20-bookworm-slim AS frontend
WORKDIR /src/frontend
RUN apt-get update && apt-get install -y --no-install-recommends git ca-certificates \
    && rm -rf /var/lib/apt/lists/*
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend ./
# يُمرَّر من Coolify Build Arguments (يُدمج في الحزمة أثناء البناء)
ARG VITE_GOOGLE_MAPS_API_KEY=
ARG VITE_API_BASE_URL=
ENV VITE_GOOGLE_MAPS_API_KEY=$VITE_GOOGLE_MAPS_API_KEY \
    VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build && npm run assert:no-uat

FROM python:3.12-slim-bookworm
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DJANGO_SETTINGS_MODULE=takaful_backend.settings
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
        nginx curl libpq5 \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt /app/backend/requirements.txt
RUN pip install --no-cache-dir -r /app/backend/requirements.txt

COPY backend /app/backend
COPY --from=frontend /src/frontend/dist /usr/share/nginx/html
COPY deploy/docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY deploy/docker/entrypoint.sh /entrypoint.sh
RUN rm -f /etc/nginx/sites-enabled/default \
    && chmod +x /entrypoint.sh \
    && mkdir -p /app/backend/media /app/backend/staticfiles /run/nginx

# ثبّت هذا المسار كـ Persistent Storage في كولفاي حتى لا تُفقد المرفقات بعد إعادة النشر
VOLUME ["/app/backend/media"]

WORKDIR /app/backend
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=90s --retries=5 \
    CMD curl -fsS http://127.0.0.1/health || exit 1

ENTRYPOINT ["/entrypoint.sh"]
