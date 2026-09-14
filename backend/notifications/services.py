"""
مساعد إشعار موحّد داخل المنصّة — يُستدعى من الـ viewsets.
التعقيد: O(R) للمستلمين؛ الاستعلام عن التفضيلات دفعة واحدة.
"""
from __future__ import annotations

import logging

from django.contrib.auth.models import User

from .models import Notification, NotificationPreference

logger = logging.getLogger(__name__)

EVENT_SERVICE_REQUEST = "service_request"
EVENT_WATER_SUPPLY = "water_supply"
EVENT_SPONSORSHIP = "sponsorship"
EVENT_VOLUNTEER = "volunteer_application"
EVENT_PROJECT = "project_status"
EVENT_BROADCAST = "broadcast"

EVENT_TYPES = (
    EVENT_SERVICE_REQUEST,
    EVENT_WATER_SUPPLY,
    EVENT_SPONSORSHIP,
    EVENT_VOLUNTEER,
    EVENT_PROJECT,
    EVENT_BROADCAST,
)


def notify(
    *,
    message: str,
    users: list[User] | None = None,
    roles: list[str] | None = None,
    notification_type: str = "info",
    link: str = "",
    event_type: str = "info",
) -> int:
    """ينشئ إشعارات للمستلمين مع احترام التفضيلات. لا يرمي للخارج."""
    try:
        recipients: dict[int, User] = {}
        for u in users or []:
            if u and getattr(u, "id", None):
                recipients[u.id] = u
        if roles:
            for u in User.objects.filter(is_active=True, profile__role__in=roles).select_related("profile"):
                recipients[u.id] = u
        if not recipients:
            return 0
        muted = set(
            NotificationPreference.objects.filter(
                event_type=event_type,
                enabled=False,
                user_id__in=list(recipients.keys()),
            ).values_list("user_id", flat=True)
        )
        batch = [
            Notification(
                user=u,
                message=message,
                notification_type=notification_type,
                link=link or "",
                event_type=event_type,
            )
            for uid, u in recipients.items()
            if uid not in muted
        ]
        if batch:
            Notification.objects.bulk_create(batch)
        return len(batch)
    except Exception as exc:  # pragma: no cover
        logger.warning("notify() failed: %s", exc)
        return 0
