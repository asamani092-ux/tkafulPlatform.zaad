"""
دعوة مستخدم جديد وتعيين كلمة المرور عبر رابط لمرة واحدة.
التعقيد: إنشاء وتحقق O(1).
"""
from __future__ import annotations

import logging
import secrets
from datetime import timedelta

from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from core.email_rtl import frontend_base_url, send_rtl_email
from core.permissions import IsAdmin
from core.throttles import AuthRateThrottle

from .models import PasswordInviteToken, Profile
from .password_ar import password_errors_to_ar
from .serializers import AdminUserSerializer

logger = logging.getLogger(__name__)

INVITE_DAYS = 7


def _frontend_base() -> str:
    return frontend_base_url()


def create_password_invite(user: User) -> PasswordInviteToken:
    PasswordInviteToken.objects.filter(user=user, consumed_at__isnull=True).update(
        consumed_at=timezone.now()
    )
    return PasswordInviteToken.objects.create(
        user=user,
        token=secrets.token_urlsafe(32),
        expires_at=timezone.now() + timedelta(days=INVITE_DAYS),
    )


def send_invite_email(invite: PasswordInviteToken, *, reset: bool = False) -> bool:
    link = f"{_frontend_base()}/set-password/{invite.token}"
    name = ""
    profile = getattr(invite.user, "profile", None)
    if profile:
        name = (profile.name or "").strip()
    if reset:
        subject = "إعادة تعيين كلمة المرور — تكافل وأثر"
        body = (
            f"السلام عليكم {name},\n\n"
            f"طلبت إعادة تعيين كلمة المرور لمنصة تكافل وأثر.\n"
            f"اضغط الرابط التالي (صالح لمدة {INVITE_DAYS} أيام):\n{link}\n\n"
            f"إن لم تطلب ذلك فتجاهل هذه الرسالة.\n\n"
            f"مع تحيات منصة تكافل وأثر"
        )
    else:
        subject = "دعوة لتعيين كلمة المرور — تكافل وأثر"
        body = (
            f"السلام عليكم {name},\n\n"
            f"تم إنشاء حساب لك في منصة تكافل وأثر.\n"
            f"عيّن كلمة المرور من الرابط التالي (صالح لمدة {INVITE_DAYS} أيام):\n{link}\n\n"
            f"البريد: {invite.user.email}\n\n"
            f"مع تحيات منصة تكافل وأثر"
        )
    try:
        return send_rtl_email(
            subject=subject,
            body=body,
            to=invite.user.email,
            fail_silently=False,
        )
    except Exception:
        logger.exception("فشل إرسال دعوة كلمة المرور لـ %s", invite.user.email)
        return False


@api_view(["POST"])
@permission_classes([AllowAny])
@throttle_classes([AuthRateThrottle])
def forgot_password(request):
    """
    طلب إعادة تعيين كلمة المرور عبر البريد.
    دائماً رسالة نجاح عامة (لا يكشف وجود الحساب). O(1).
    """
    email = (request.data.get("email") or "").strip().lower()
    generic = {
        "detail": "إن وُجد حساب بهذا البريد فستصلك رسالة لإعادة تعيين كلمة المرور",
    }
    if not email or "@" not in email:
        return Response({"email": "أدخل بريداً إلكترونياً صالحاً"}, status=400)
    user = User.objects.filter(email__iexact=email, is_active=True).first()
    if user and user.has_usable_password():
        invite = create_password_invite(user)
        send_invite_email(invite, reset=True)
    elif user:
        # حساب بلا كلمة مرور قابلة للاستخدام — أرسل دعوة تعيين
        invite = create_password_invite(user)
        send_invite_email(invite, reset=True)
    return Response(generic, status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([IsAdmin])
def invite_user(request):
    """إنشاء مستخدم إن لزم مع إرسال دعوة تعيين كلمة مرور. O(1)."""
    email = (request.data.get("email") or "").strip().lower()
    name = (request.data.get("name") or "").strip()
    role = (request.data.get("role") or "employee").strip()
    if not email:
        return Response({"email": "البريد مطلوب"}, status=400)
    if not name:
        return Response({"name": "الاسم مطلوب"}, status=400)
    if role not in dict(Profile.ROLE_CHOICES):
        return Response({"role": "دور غير صالح"}, status=400)

    created = False
    user = User.objects.filter(email__iexact=email).select_related("profile").first()
    if not user:
        with transaction.atomic():
            user = User.objects.create_user(username=email, email=email)
            user.set_unusable_password()
            user.save(update_fields=["password"])
            profile = user.profile
            profile.name = name
            profile.role = role
            profile.is_approved = True
            profile.must_reset_password = True
            profile.save(update_fields=["name", "role", "is_approved", "must_reset_password"])
            created = True
    else:
        profile = user.profile
        if name and not (profile.name or "").strip():
            profile.name = name
            profile.save(update_fields=["name"])

    invite = create_password_invite(user)
    emailed = send_invite_email(invite)
    return Response(
        {
            "user": AdminUserSerializer(user).data,
            "created": created,
            "invite_sent": emailed,
            "invite_expires_at": invite.expires_at,
        },
        status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
    )


@api_view(["GET"])
@permission_classes([AllowAny])
@throttle_classes([AuthRateThrottle])
def invite_status(request, token: str):
    invite = (
        PasswordInviteToken.objects.select_related("user", "user__profile")
        .filter(token=token)
        .first()
    )
    if not invite or invite.consumed_at or invite.expires_at < timezone.now():
        return Response({"detail": "الرابط غير صالح أو منتهٍ"}, status=400)
    return Response(
        {
            "email": invite.user.email,
            "name": getattr(invite.user.profile, "name", "") or "",
            "expires_at": invite.expires_at,
        }
    )


@api_view(["POST"])
@permission_classes([AllowAny])
@throttle_classes([AuthRateThrottle])
def accept_invite(request, token: str):
    invite = (
        PasswordInviteToken.objects.select_related("user", "user__profile")
        .filter(token=token)
        .first()
    )
    if not invite or invite.consumed_at or invite.expires_at < timezone.now():
        return Response({"detail": "الرابط غير صالح أو منتهٍ"}, status=400)
    password = request.data.get("password") or ""
    try:
        validate_password(password, user=invite.user)
    except DjangoValidationError as exc:
        return Response({"password": password_errors_to_ar(list(exc.messages))}, status=400)
    user = invite.user
    user.set_password(password)
    user.is_active = True
    user.save(update_fields=["password", "is_active"])
    profile = user.profile
    if profile.must_reset_password:
        profile.must_reset_password = False
        profile.save(update_fields=["must_reset_password"])
    invite.consumed_at = timezone.now()
    invite.save(update_fields=["consumed_at"])
    return Response({"detail": "تم تعيين كلمة المرور — يمكنك تسجيل الدخول الآن"})
