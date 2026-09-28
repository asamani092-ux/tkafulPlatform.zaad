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

MSG_FROM_MISMATCH = (
    "بريد المرسل يجب أن يطابق حساب SMTP أو يملك صلاحية الإرسال باسمه"
)
MSG_SEND_AS_DENIED = (
    "غير مسموح الإرسال بهذا البريد؛ اختر بريد المرسل المطابق لحساب SMTP"
)
MSG_SMTP_GENERIC = "تعذّر إرسال البريد — تحقق من إعدادات SMTP وحاول مرة أخرى"


class MailFromMismatchError(ValueError):
    """رفض From قبل SMTP عند عدم التطابق مع EMAIL_HOST_USER."""


def frontend_base_url() -> str:
    """رابط الواجهة لروابط البريد — يرفض localhost في الإنتاج. O(1)."""
    url = (getattr(settings, "FRONTEND_BASE_URL", None) or "").rstrip("/")
    debug = bool(getattr(settings, "DEBUG", True))
    if url and ("localhost" in url.lower() or "127.0.0.1" in url) and not debug:
        # احتياط إن تُجاوز الإعداد يدوياً
        for key in ("CSRF_TRUSTED_ORIGINS", "CORS_ALLOWED_ORIGINS"):
            for origin in getattr(settings, key, []) or []:
                o = str(origin).rstrip("/")
                if o.startswith("https://") and "localhost" not in o and "127.0.0.1" not in o:
                    return o
    return url or "http://localhost:3000"


def smtp_host_user() -> str:
    return (getattr(settings, "EMAIL_HOST_USER", None) or "").strip()


def default_from_email() -> str:
    """قيمة From الافتراضية — تفضّل حساب SMTP ثم إعداد المنصّة ثم DEFAULT_FROM_EMAIL."""
    return resolve_from_email(None)


def ensure_mail_from_email() -> str:
    """يملأ mail_from_email من البيئة إن كان فارغاً. O(1)."""
    from core.models import PlatformSetting

    obj = PlatformSetting.load()
    current = (obj.mail_from_email or "").strip()
    if current:
        return current
    host = smtp_host_user()
    fallback = (getattr(settings, "DEFAULT_FROM_EMAIL", None) or "").strip()
    fill = host or fallback
    if fill:
        obj.mail_from_email = fill
        obj.save(update_fields=["mail_from_email"])
    return fill


def resolve_from_email(explicit: str | None = None) -> str:
    """
    أولوية From: صريح → إعداد المنصّة → EMAIL_HOST_USER → DEFAULT_FROM_EMAIL.
    إن وُجد EMAIL_HOST_USER واختلف عن From → رفض عربي قبل SMTP.
    """
    candidate = (explicit or "").strip()
    if not candidate:
        try:
            candidate = ensure_mail_from_email()
        except Exception:
            candidate = ""
    if not candidate:
        candidate = smtp_host_user()
    if not candidate:
        candidate = (getattr(settings, "DEFAULT_FROM_EMAIL", None) or "").strip()
    if not candidate:
        candidate = "noreply@takaful.local"

    host = smtp_host_user()
    if host and candidate.lower() != host.lower():
        raise MailFromMismatchError(MSG_FROM_MISMATCH)
    return candidate


def smtp_error_to_ar(exc: BaseException) -> str:
    """ترجمة أخطاء SMTP الشائعة إلى جملة عربية قصيرة — بلا سلسلة MAPI."""
    text = str(exc or "")
    lower = text.lower()
    if "sendasdenied" in lower or "not allowed to send as" in lower or " 554 " in f" {text} ":
        return MSG_SEND_AS_DENIED
    if "authentication" in lower or "535" in text or "login" in lower:
        return "فشل التحقق من حساب SMTP — راجع بريد المرسل وكلمة المرور"
    if isinstance(exc, MailFromMismatchError):
        return str(exc) or MSG_FROM_MISMATCH
    return MSG_SMTP_GENERIC


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
    from_email: str | None = None,
) -> bool:
    """يرسل بريداً بنسخة نصية وHTML باتجاه RTL. O(1)."""
    recipients = [to] if isinstance(to, str) else list(to or [])
    recipients = [(e or "").strip() for e in recipients if (e or "").strip()]
    recipients = [e for e in recipients if _EMAIL_RE.match(e)]
    if not recipients:
        return False
    try:
        sender = resolve_from_email(from_email)
        msg = EmailMultiAlternatives(
            subject=subject,
            body=body,
            from_email=sender,
            to=recipients,
        )
        msg.attach_alternative(render_rtl_html(title=subject, plain_body=body), "text/html")
        msg.send(fail_silently=False)
        return True
    except MailFromMismatchError:
        logger.warning("رفض From غير المطابق لـ SMTP")
        if not fail_silently:
            raise
        return False
    except Exception:
        logger.exception("فشل إرسال بريد RTL إلى %s", recipients)
        if not fail_silently:
            # أعد رفع الاستثناء الأصلي؛ المستدعي يستخدم smtp_error_to_ar
            raise
        return False
