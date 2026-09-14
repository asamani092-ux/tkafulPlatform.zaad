"""
مساعد إشعار موحّد داخل المنصّة — يُستدعى من الـ viewsets.
ينشئ إشعاراً داخل المنصّة (+ بريد اختياري) مع احترام التفضيلات.
التعقيد: O(R) للمستلمين؛ الاستعلام عن التفضيلات دفعة واحدة.
"""
from __future__ import annotations

import logging
import re

from django.conf import settings
from django.contrib.auth.models import User
from django.core.mail import send_mail

from .models import Notification, NotificationPreference

logger = logging.getLogger(__name__)

EVENT_SERVICE_REQUEST = "service_request"
EVENT_WATER_SUPPLY = "water_supply"
EVENT_SPONSORSHIP = "sponsorship"
EVENT_VOLUNTEER = "volunteer_application"
EVENT_VOLUNTEER_OPPORTUNITY = "volunteer_opportunity"
EVENT_VOLUNTEER_DECISION = "volunteer_decision"
EVENT_SUGGESTION = "suggestion_received"
EVENT_PROJECT = "project_status"
EVENT_BROADCAST = "broadcast"

EVENT_TYPES = (
    EVENT_SERVICE_REQUEST,
    EVENT_WATER_SUPPLY,
    EVENT_SPONSORSHIP,
    EVENT_VOLUNTEER,
    EVENT_VOLUNTEER_OPPORTUNITY,
    EVENT_VOLUNTEER_DECISION,
    EVENT_SUGGESTION,
    EVENT_PROJECT,
    EVENT_BROADCAST,
)

_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def _send_email(to_email: str, subject: str, body: str) -> None:
    if not to_email or not _EMAIL_RE.match(to_email):
        return
    try:
        send_mail(
            subject,
            body,
            getattr(settings, "DEFAULT_FROM_EMAIL", None) or "noreply@takaful.local",
            [to_email],
            fail_silently=True,
        )
    except Exception as exc:  # pragma: no cover
        logger.warning("email notify failed: %s", exc)


def notify(
    *,
    message: str,
    users: list[User] | None = None,
    roles: list[str] | None = None,
    notification_type: str = "info",
    link: str = "",
    event_type: str = "info",
    email_subject: str | None = None,
    email_addresses: list[str] | None = None,
) -> int:
    """ينشئ إشعارات للمستلمين مع احترام التفضيلات، ويرسل بريداً إن طُلب.

    email_subject: إن وُجد يُرسل بريد لكل مستخدم له بريد + لأي email_addresses.
    """
    try:
        recipients: dict[int, User] = {}
        for u in users or []:
            if u and getattr(u, "id", None):
                recipients[u.id] = u
        if roles:
            for u in User.objects.filter(is_active=True, profile__role__in=roles).select_related("profile"):
                recipients[u.id] = u
        muted: set[int] = set()
        if recipients:
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

        if email_subject:
            mailed: set[str] = set()
            for uid, u in recipients.items():
                if uid in muted:
                    continue
                email = (getattr(u, "email", None) or "").strip()
                if email and email.lower() not in mailed:
                    _send_email(email, email_subject, message)
                    mailed.add(email.lower())
            for raw in email_addresses or []:
                email = (raw or "").strip()
                if email and email.lower() not in mailed:
                    _send_email(email, email_subject, message)
                    mailed.add(email.lower())

        return len(batch)
    except Exception as exc:  # pragma: no cover
        logger.warning("notify() failed: %s", exc)
        return 0


def notify_approved_volunteers_opportunity(*, project_name: str, project_id: int | None = None) -> int:
    """إشعار فرصة تطوع لكل المتطوعين المعتمدين النشطين."""
    qs = User.objects.filter(
        is_active=True,
        profile__role="user",
        profile__is_approved=True,
    ).select_related("profile")
    users = list(qs)
    link = "/user/opportunities"
    if project_id:
        link = f"/user/opportunities"
    return notify(
        message=f"فرصة تطوع جديدة في مشروع «{project_name}» — يمكنك التقديم الآن.",
        users=users,
        notification_type="action",
        link=link,
        event_type=EVENT_VOLUNTEER_OPPORTUNITY,
        email_subject=f"فرصة تطوع: {project_name}",
    )
