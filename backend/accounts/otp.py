"""
خدمة OTP بريدية قصيرة الأجل.
التعقيد الزمني: إنشاء/تحقق O(1) لكل طلب (استعلام مفهرس + تحديث صف).
التعقيد المكاني: O(1) لكل رمز.
"""
from __future__ import annotations

import logging
import secrets
from datetime import timedelta

from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone

from .models import EmailOTP

logger = logging.getLogger(__name__)

OTP_TTL_MINUTES = 10
OTP_MAX_ATTEMPTS = 5
OTP_LENGTH = 6


def _generate_code() -> str:
    # 000000–999999 — مساحة كافية لرمز قصير الأجل
    return f"{secrets.randbelow(10**OTP_LENGTH):0{OTP_LENGTH}d}"


def request_otp(email: str, purpose: str) -> EmailOTP:
    """ينشئ رمزاً جديداً ويرسله بالبريد. يُبطل الرموز السابقة غير المستخدمة لنفس البريد+الغرض."""
    email = (email or "").strip().lower()
    if purpose not in {EmailOTP.PURPOSE_LOGIN, EmailOTP.PURPOSE_REGISTER}:
        raise ValueError("غرض OTP غير صالح")

    EmailOTP.objects.filter(
        email=email,
        purpose=purpose,
        consumed_at__isnull=True,
    ).update(consumed_at=timezone.now())

    code = _generate_code()
    otp = EmailOTP.objects.create(
        email=email,
        code=code,
        purpose=purpose,
        expires_at=timezone.now() + timedelta(minutes=OTP_TTL_MINUTES),
    )
    subject = "رمز التحقق — منصة تكافل"
    body = (
        f"رمز التحقق الخاص بك: {code}\n"
        f"صالح لمدة {OTP_TTL_MINUTES} دقائق.\n"
        "إذا لم تطلب هذا الرمز فتجاهل الرسالة."
    )
    try:
        send_mail(
            subject,
            body,
            getattr(settings, "DEFAULT_FROM_EMAIL", "no-reply@alzad.org"),
            [email],
            fail_silently=False,
        )
    except Exception:
        logger.exception("فشل إرسال OTP إلى %s", email)
        # في التطوير (console backend) نادراً ما يفشل؛ نبقي الرمز للاختبار
        if not settings.DEBUG:
            otp.delete()
            raise
    return otp


def verify_otp(email: str, purpose: str, code: str) -> bool:
    """يتحقق من الرمز ويستهلكه عند النجاح. False عند الفشل/الانتهاء/تجاوز المحاولات."""
    email = (email or "").strip().lower()
    code = (code or "").strip()
    otp = (
        EmailOTP.objects.filter(
            email=email,
            purpose=purpose,
            consumed_at__isnull=True,
        )
        .order_by("-created_at")
        .first()
    )
    if not otp:
        return False
    if otp.expires_at < timezone.now():
        return False
    if otp.attempts >= OTP_MAX_ATTEMPTS:
        return False
    if otp.code != code:
        EmailOTP.objects.filter(pk=otp.pk).update(attempts=otp.attempts + 1)
        return False
    otp.consumed_at = timezone.now()
    otp.save(update_fields=["consumed_at"])
    return True
