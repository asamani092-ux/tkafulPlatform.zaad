"""
Django settings for takaful_backend project (Render-ready).
"""

from pathlib import Path
import os

import dj_database_url
from dotenv import load_dotenv

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Load .env for local development (Render will use real env vars)
load_dotenv(BASE_DIR / ".env")


# ===========================
# Basic security settings
# ===========================

# In production (Render) you MUST set SECRET_KEY as an env var
SECRET_KEY = os.environ.get("SECRET_KEY", "dev-secret-key-change-me")

# DEBUG should be False in production
DEBUG = os.environ.get("DEBUG", "True") == "True"

# Example:
# ALLOWED_HOSTS="tkaful.alzaad.org.sa,localhost,127.0.0.1"
# دائماً نضيف localhost/127.0.0.1 لفحص الصحة داخل الحاوية (Coolify healthcheck)
ALLOWED_HOSTS = [
    h.strip()
    for h in os.environ.get("ALLOWED_HOSTS", "localhost,127.0.0.1").split(",")
    if h.strip()
]
for _h in ("localhost", "127.0.0.1"):
    if _h not in ALLOWED_HOSTS:
        ALLOWED_HOSTS.append(_h)


# ===========================
# Application definition
# ===========================

INSTALLED_APPS = [
    # Django apps
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",

    # Third-party apps
    "rest_framework",
    "rest_framework_simplejwt.token_blacklist",  # إبطال refresh عند الخروج
    "corsheaders",

    # Local apps
    "core",
    "takaful_app",
    "accounts",
    "analytics",
    "notifications",
    "integrations",  # طبقة استقبال المصادر الخارجية (تجهيز المشروع الثالث)
    "saqya",         # وحدة كفالات السقيا (المشروع الثالث)
    "impact_map",    # خارطة تفقدهم — شفافية التوزيع (بيانات قديمة؛ انظر DECISIONS.md D-03)
    "projects",      # المشروع ككيان أول (project-first)
    "maps",          # نظام الخرائط المتعددة
    "sponsorships",  # الكفالات (منقولة من saqya — D-02)
    "volunteering",  # التطوع (منقول من takaful_app — D-02)
    "services",      # الخدمات (Phase A4)
    "reporting",     # التقارير والإحصائيات (Phase A4)
    "projectdocs",   # ملف المشروع الداخلي (بطاقة/وثيقة/خطة/إغلاق)
]


MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",  # CORS
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "takaful_backend.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "takaful_backend.wsgi.application"


# ===========================
# Database
# ===========================
# Local: uses SQLite
# Render: uses DATABASE_URL (PostgreSQL)

DATABASES = {
    "default": dj_database_url.config(
        default=f"sqlite:///{BASE_DIR / 'db.sqlite3'}",
        conn_max_age=600,
    )
}


# ===========================
# Password validation
# ===========================

AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
    },
]


# ===========================
# Internationalization
# ===========================

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True


# ===========================
# Static files
# ===========================

STATIC_URL = "static/"
# Render will collect static files here
STATIC_ROOT = BASE_DIR / "staticfiles"

# ===========================
# Media (uploads)
# ===========================
# ملفات الوسائط (فواتير/توثيق كفالات السقيا) تُخزَّن تحت MEDIA_ROOT.
# ملاحظة أمنية: ملفات saqya توضع في private/ ولا تُقدَّم عبر MEDIA_URL،
# بل عبر view مصادق (saqya) يتحقّق من الدور/الملكية.
MEDIA_URL = "media/"
MEDIA_ROOT = BASE_DIR / "media"
SAQYA_MAX_UPLOAD_SIZE = 16 * 1024 * 1024  # 16MB

# البريد: console محلياً، SMTP عبر البيئة في الإنتاج (أوت لوك / Office 365)
EMAIL_BACKEND = os.environ.get(
    "EMAIL_BACKEND", "django.core.mail.backends.console.EmailBackend"
)
EMAIL_HOST = os.environ.get("EMAIL_HOST", "smtp.office365.com")
EMAIL_PORT = int(os.environ.get("EMAIL_PORT", "587"))
EMAIL_HOST_USER = os.environ.get("EMAIL_HOST_USER", "")
EMAIL_HOST_PASSWORD = os.environ.get("EMAIL_HOST_PASSWORD", "")
EMAIL_USE_TLS = os.environ.get("EMAIL_USE_TLS", "True").lower() in ("1", "true", "yes")
EMAIL_USE_SSL = os.environ.get("EMAIL_USE_SSL", "False").lower() in ("1", "true", "yes")
DEFAULT_FROM_EMAIL = os.environ.get("DEFAULT_FROM_EMAIL", "tkaful@alzaad.org.sa")
SERVER_EMAIL = os.environ.get("SERVER_EMAIL", DEFAULT_FROM_EMAIL)
# طارئ فقط: تخطّي OTP عند الدخول إذا فشل البريد أو أثناء ضبط SMTP
LOGIN_OTP_DISABLED = os.environ.get("LOGIN_OTP_DISABLED", "False").lower() in (
    "1",
    "true",
    "yes",
)

EXTERNAL_STORE_URL = os.environ.get("EXTERNAL_STORE_URL", "")

# Internal UAT evaluation form status API — off by default; never set in production.
UAT_ENABLED = os.environ.get("UAT_ENABLED", "False").lower() in ("1", "true", "yes")

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
# ===========================

# CORS Configuration
# Explicit origins for credentials support
CORS_ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.environ.get(
        "CORS_ALLOWED_ORIGINS",
        "https://takaful-one.vercel.app,http://localhost:5173,http://127.0.0.1:5173"
    ).split(",")
    if origin.strip()
]

# Also allow Vercel preview URLs
CORS_ALLOWED_ORIGIN_REGEXES = [
    r"^https://takaful-.*\.vercel\.app$",
]

CORS_ALLOW_CREDENTIALS = True

# Allow all headers and methods
CORS_ALLOW_HEADERS = [
    "accept",
    "accept-encoding",
    "authorization",
    "content-type",
    "dnt",
    "origin",
    "user-agent",
    "x-csrftoken",
    "x-requested-with",
]

CORS_ALLOW_METHODS = [
    "DELETE",
    "GET",
    "OPTIONS",
    "PATCH",
    "POST",
    "PUT",
]

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
        "rest_framework.authentication.SessionAuthentication",
    ],
    # افتراضياً يتطلّب مصادقة؛ النقاط العامة تُصرّح AllowAny بشكل صريح.
    # هذا يحمي أي endpoint مستقبلي (بما فيها المشروع الثالث) من الانكشاف بالخطأ.
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    # تحديد معدّل الطلبات لمنع العبث وهجمات brute-force
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
        "rest_framework.throttling.ScopedRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "anon": "60/min",
        "user": "240/min",
        "auth": "10/min",      # تسجيل/دخول
        "public_write": "20/min",  # النماذج العامة (اقتراح/طلب خدمة/سقيا)
        "broadcast": "10/hour",    # بث إشعارات المشرف
    },
}


# ===========================
# JWT Settings
# ===========================
from datetime import timedelta

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(days=1),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': True,
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    'AUTH_HEADER_TYPES': ('Bearer',),
    'AUTH_HEADER_NAME': 'HTTP_AUTHORIZATION',
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
}

# ===========================
# CSRF (for admin or auth)
# ===========================

# Example you will set on Render:
# CSRF_TRUSTED_ORIGINS="https://takaful-backend.onrender.com"
CSRF_TRUSTED_ORIGINS = [
    origin
    for origin in os.environ.get("CSRF_TRUSTED_ORIGINS", "").split(",")
    if origin
]


# ===========================
# Production security hardening
# ===========================
# تُفعَّل فقط خارج وضع التطوير (DEBUG=False) حتى لا تعيق التطوير المحلي.
if not DEBUG:
    # منع التشغيل في الإنتاج بمفتاح افتراضي ضعيف
    if SECRET_KEY == "dev-secret-key-change-me":
        raise RuntimeError(
            "SECRET_KEY must be set via environment in production (DEBUG=False)."
        )

    # الثقة بترويسة البروكسي لتحديد HTTPS (Coolify / Nginx)
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
    USE_X_FORWARDED_HOST = True
    SECURE_SSL_REDIRECT = os.environ.get("SECURE_SSL_REDIRECT", "True").lower() in (
        "1",
        "true",
        "yes",
    )

    # HSTS
    SECURE_HSTS_SECONDS = 60 * 60 * 24 * 30  # 30 يوماً
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True

    # كوكيز آمنة
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True

    # ترويسات حماية إضافية
    SECURE_CONTENT_TYPE_NOSNIFF = True
    SESSION_COOKIE_HTTPONLY = True
    X_FRAME_OPTIONS = "DENY"
