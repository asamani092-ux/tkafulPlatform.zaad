"""Validation helpers for saqya uploads and GPS coordinates."""
import os

from django.conf import settings

# Allowed MIME types and extensions for invoice/documentation uploads
ALLOWED_UPLOAD_MIMES = frozenset({
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
})
ALLOWED_UPLOAD_EXTENSIONS = frozenset({".pdf", ".jpg", ".jpeg", ".png", ".webp", ".gif"})
BLOCKED_EXTENSIONS = frozenset({
    ".exe", ".bat", ".cmd", ".sh", ".php", ".js", ".html", ".htm", ".py", ".jar", ".msi",
})


def validate_upload_file(uploaded_file):
    """Reject executables/scripts and enforce size + type limits."""
    if not uploaded_file:
        return None
    if uploaded_file.size > settings.SAQYA_MAX_UPLOAD_SIZE:
        return "حجم الملف يتجاوز الحد المسموح"
    ext = os.path.splitext(uploaded_file.name)[1].lower()
    if ext in BLOCKED_EXTENSIONS:
        return "نوع الملف غير مسموح"
    if ext and ext not in ALLOWED_UPLOAD_EXTENSIONS:
        return "نوع الملف غير مسموح"
    content_type = getattr(uploaded_file, "content_type", "") or ""
    if content_type and content_type not in ALLOWED_UPLOAD_MIMES:
        return "نوع الملف غير مسموح"
    return None


def validate_gps(latitude, longitude):
    """Validate WGS-84 coordinate ranges."""
    if latitude is None and longitude is None:
        return None
    if latitude is None or longitude is None:
        return "يجب توفير خط العرض وخط الطول معاً"
    try:
        lat = float(latitude)
        lng = float(longitude)
    except (TypeError, ValueError):
        return "إحداثيات GPS غير صالحة"
    if not (-90 <= lat <= 90):
        return "خط العرض يجب أن يكون بين -90 و 90"
    if not (-180 <= lng <= 180):
        return "خط الطول يجب أن يكون بين -180 و 180"
    return None
