"""
إرسال بريد عربي بتنسيق من اليمين لليسار (نص + HTML).
التعقيد: O(1) لكل رسالة.
"""
from __future__ import annotations

import html
import logging
import re

from django.conf import settings
from django.core.mail import EmailMultiAlternatives

logger = logging.getLogger(__name__)

_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def frontend_base_url() -> str:
    return (getattr(settings, "FRONTEND_BASE_URL", None) or "http://localhost:3000").rstrip("/")


def default_from_email() -> str:
    return getattr(settings, "DEFAULT_FROM_EMAIL", None) or "noreply@takaful.local"


def _plain_to_html_body(plain: str) -> str:
    escaped = html.escape(plain or "")
    # روابط http(s) → <a>
    escaped = re.sub(
        r"(https?://[^\s<]+)",
        r'<a href="\1" style="color:#7a1f2b;word-break:break-all;">\1</a>',
        escaped,
    )
    paragraphs = escaped.split("\n\n")
    blocks = []
    for p in paragraphs:
        inner = p.replace("\n", "<br>\n")
        blocks.append(f'<p style="margin:0 0 12px;line-height:1.7;">{inner}</p>')
    return "\n".join(blocks)


def render_rtl_html(*, title: str, plain_body: str) -> str:
    safe_title = html.escape(title or "تكافل وأثر")
    body_html = _plain_to_html_body(plain_body)
    return (
        "<!DOCTYPE html>"
        f'<html lang="ar" dir="rtl">'
        "<head><meta charset=\"utf-8\">"
        f"<title>{safe_title}</title></head>"
        '<body style="margin:0;padding:0;background:#f5f5f5;font-family:'
        "Tahoma,'Segoe UI',Arial,sans-serif;direction:rtl;text-align:right;\">"
        '<div style="max-width:560px;margin:24px auto;padding:24px;'
        'background:#ffffff;border:1px solid #e5e5e5;border-radius:8px;'
        'direction:rtl;text-align:right;color:#1a1a1a;">'
        f'<h1 style="margin:0 0 16px;font-size:18px;color:#7a1f2b;">{safe_title}</h1>'
        f"{body_html}"
        '<p style="margin:24px 0 0;font-size:12px;color:#666;">منصة تكافل وأثر — جمعية الزاد</p>'
        "</div></body></html>"
    )


def send_rtl_email(
    *,
    subject: str,
    body: str,
    to: list[str] | str,
    fail_silently: bool = False,
) -> bool:
    """يرسل بريداً بنسخة نصية وHTML باتجاه RTL. O(1)."""
    recipients = [to] if isinstance(to, str) else list(to or [])
    recipients = [(e or "").strip() for e in recipients if (e or "").strip()]
    recipients = [e for e in recipients if _EMAIL_RE.match(e)]
    if not recipients:
        return False
    try:
        msg = EmailMultiAlternatives(
            subject=subject,
            body=body,
            from_email=default_from_email(),
            to=recipients,
        )
        msg.attach_alternative(render_rtl_html(title=subject, plain_body=body), "text/html")
        msg.send(fail_silently=False)
        return True
    except Exception:
        logger.exception("فشل إرسال بريد RTL إلى %s", recipients)
        if not fail_silently:
            raise
        return False
