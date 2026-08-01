"""shim توافق: مسارات /api/ القديمة تُخدم من volunteering.urls (D-05)."""
from volunteering.urls import urlpatterns  # noqa: F401
