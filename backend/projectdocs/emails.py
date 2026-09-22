"""إرسال بريد الاعتماد برابط عام فريد."""
from __future__ import annotations

import logging
import os

from django.conf import settings
from django.core.mail import send_mail

logger = logging.getLogger(__name__)


def frontend_base_url() -> str:
    return (
        os.environ.get("FRONTEND_URL")
        or os.environ.get("PUBLIC_APP_URL")
        or "http://localhost:3000"
    ).rstrip("/")


def approval_review_url(token: str) -> str:
    return f"{frontend_base_url()}/approvals/{token}"


def send_approval_email(approval) -> bool:
    dossier = approval.dossier
    to = (dossier.sponsor_email or "").strip()
    if not to:
        logger.warning("لا بريد راعي لإرسال اعتماد %s", dossier.code)
        return False
    link = approval_review_url(approval.token)
    stage_label = approval.stage.key if approval.stage_id else approval.scope
    subject = f"طلب اعتماد مشروع {dossier.code} — {stage_label}"
    body = (
        f"السلام عليكم {dossier.sponsor_name or ''},\n\n"
        f"يُرجى مراجعة واعتماد ملف المشروع «{dossier.project.name}» ({dossier.code}).\n"
        f"النطاق: {approval.scope}"
        + (f" / المرحلة: {approval.stage.key}" if approval.stage_id else "")
        + f"\n\nرابط المراجعة (استخدام واحد):\n{link}\n\n"
        f"ينتهي الرابط في: {approval.expires_at}\n\n"
        f"مع تحيات منصة تكافل وأثر"
    )
    try:
        send_mail(
            subject,
            body,
            settings.DEFAULT_FROM_EMAIL,
            [to],
            fail_silently=False,
        )
        return True
    except Exception:
        logger.exception("فشل إرسال بريد الاعتماد لـ %s", to)
        return False


def send_reminder_email(*, to: str, subject: str, body: str) -> bool:
    if not to:
        return False
    try:
        send_mail(subject, body, settings.DEFAULT_FROM_EMAIL, [to], fail_silently=True)
        return True
    except Exception:
        logger.exception("فشل تذكير إلى %s", to)
        return False
