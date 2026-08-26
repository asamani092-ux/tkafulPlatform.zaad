"""
سجل نشاط للإجراءات الحسّاسة — إضافة فقط.
التعقيد: الإدراج O(1)؛ القائمة صفحة P مع فلاتر مفهرسة.
"""
from __future__ import annotations

from django.contrib.auth.models import User

from .models import ActivityLog

ACTION_USER_CREATE = "user_create"
ACTION_USER_UPDATE = "user_update"
ACTION_USER_DELETE = "user_delete"
ACTION_USER_SET_ROLE = "user_set_role"
ACTION_USER_SET_ACTIVE = "user_set_active"
ACTION_PROJECT_CREATE = "project_create"
ACTION_PROJECT_DELETE = "project_delete"
ACTION_PROJECT_STATUS = "project_status_change"
ACTION_SPONSORSHIP_APPROVE = "sponsorship_approve"
ACTION_ORDER_ASSIGN = "order_assign"
ACTION_SETTINGS_CHANGE = "settings_change"
ACTION_BROADCAST = "broadcast"
ACTION_STATIC_PAGE_PUBLISH = "static_page_publish"

SECRET_TOKENS = ("password", "token", "secret", "refresh", "access")


def _client_ip(request) -> str | None:
    if request is None:
        return None
    forwarded = (request.META.get("HTTP_X_FORWARDED_FOR") or "").split(",")[0].strip()
    return forwarded or request.META.get("REMOTE_ADDR") or None


def _safe_summary(summary: str) -> str:
    text = (summary or "").strip()[:240]
    lowered = text.lower()
    if any(tok in lowered for tok in SECRET_TOKENS):
        return "إجراء حسّاس"
    return text


def log_activity(*, actor: User | None, action: str, summary: str, request=None, target=None) -> ActivityLog:
    target_type = ""
    target_id = ""
    if target is not None:
        target_type = target.__class__.__name__
        pk = getattr(target, "pk", None)
        target_id = "" if pk is None else str(pk)
    return ActivityLog.objects.create(
        actor=actor if getattr(actor, "is_authenticated", False) else None,
        action=action,
        target_type=target_type,
        target_id=target_id,
        summary=_safe_summary(summary),
        ip=_client_ip(request),
    )
