"""
بريد ملف المشروع — الاعتماد يُرسل لصاحب الاعتماد بتنسيق RTL.
"""
from __future__ import annotations

import logging

from core.email_rtl import frontend_base_url, send_rtl_email

logger = logging.getLogger(__name__)


def approval_review_url(token: str) -> str:
    return f"{frontend_base_url()}/approvals/{token}"


def send_approval_email(approval) -> bool:
    dossier = approval.dossier
    to = (getattr(approval, "recipient_email", "") or dossier.approver_email or "").strip()
    if not to:
        logger.warning("لا بريد معتمد لإرسال اعتماد %s", dossier.code)
        return False
    link = approval_review_url(approval.token)
    stage_label = approval.stage.key if approval.stage_id else approval.scope
    snap = approval.payload_snapshot or {}
    workspace_label = snap.get("workspace_label") or stage_label
    subject = f"طلب اعتماد مشروع {dossier.code} — {workspace_label}"
    greeting = getattr(approval, "recipient_name", "") or snap.get("approver_name") or dossier.approver_name or ""
    body = (
        f"السلام عليكم {greeting},\n\n"
        f"يُرجى مراجعة واعتماد ملف المشروع «{dossier.project.name}» ({dossier.code}).\n"
        f"التبويب: {workspace_label}"
        + (f" / المرحلة: {approval.stage.key}" if approval.stage_id else "")
        + f"\n\nرابط المراجعة (ملخص للقراءة فقط ثم قبول أو رفض مع السبب):\n{link}\n\n"
        f"ينتهي الرابط في: {approval.expires_at}\n\n"
        f"مع تحيات منصة تكافل وأثر"
    )
    try:
        return send_rtl_email(subject=subject, body=body, to=to, fail_silently=False)
    except Exception:
        logger.exception("فشل إرسال بريد الاعتماد لـ %s", to)
        return False


def send_reminder_email(*, to: str, subject: str, body: str) -> bool:
    if not to:
        return False
    try:
        return send_rtl_email(subject=subject, body=body, to=to, fail_silently=False)
    except Exception:
        logger.exception("فشل إرسال تذكير لـ %s", to)
        return False
