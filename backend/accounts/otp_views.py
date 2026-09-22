"""واجهات OTP للدخول — لا يُصدر JWT قبل نجاح الرمز (ما لم يُعطَّل OTP طارئاً)."""
from django.conf import settings
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

from core.runtime_config import role_can_login
from core.throttles import AuthRateThrottle

from .models import EmailOTP
from .otp import request_otp, verify_otp


def _resolve_user(email: str, password: str):
    email = (email or "").strip().lower()
    user = User.objects.filter(email__iexact=email).first()
    if not user:
        user = User.objects.filter(username__iexact=email).first()
    if not user:
        return None
    return authenticate(username=user.username, password=password)


def _issue_tokens(user):
    refresh = RefreshToken.for_user(user)
    return {
        "access": str(refresh.access_token),
        "refresh": str(refresh),
        "email": user.email,
    }


@api_view(["POST"])
@permission_classes([AllowAny])
@throttle_classes([AuthRateThrottle])
def login_request_otp(request):
    email = (request.data.get("email") or request.data.get("username") or "").strip()
    password = request.data.get("password") or ""
    user = _resolve_user(email, password)
    if not user:
        return Response(
            {"detail": "البريد الإلكتروني أو كلمة المرور غير صحيحة"},
            status=status.HTTP_401_UNAUTHORIZED,
        )
    role = getattr(getattr(user, "profile", None), "role", None) or "user"
    if not role_can_login(role):
        return Response(
            {"detail": "تسجيل الدخول غير مفعّل لهذا الدور على هذه المنصّة"},
            status=status.HTTP_403_FORBIDDEN,
        )

    # تجاوز طارئ أثناء ضبط SMTP — يُفضَّل تعطيله بعد استقرار البريد
    if getattr(settings, "LOGIN_OTP_DISABLED", False):
        return Response({**_issue_tokens(user), "otp_required": False})

    try:
        request_otp(user.email or email, EmailOTP.PURPOSE_LOGIN)
    except Exception:
        return Response(
            {
                "detail": (
                    "تعذّر إرسال رمز التحقق عبر البريد. "
                    "تحقق من EMAIL_HOST_PASSWORD وإعدادات أوتلوك (SMTP)."
                )
            },
            status=502,
        )
    return Response({
        "detail": "تم إرسال رمز التحقق إلى بريدك",
        "email": (user.email or email).lower(),
        "otp_required": True,
    })


@api_view(["POST"])
@permission_classes([AllowAny])
@throttle_classes([AuthRateThrottle])
def login_verify_otp(request):
    email = (request.data.get("email") or request.data.get("username") or "").strip()
    password = request.data.get("password") or ""
    code = request.data.get("otp") or request.data.get("code") or ""
    user = _resolve_user(email, password)
    if not user:
        return Response(
            {"detail": "البريد الإلكتروني أو كلمة المرور غير صحيحة"},
            status=status.HTTP_401_UNAUTHORIZED,
        )
    role = getattr(getattr(user, "profile", None), "role", None) or "user"
    if not role_can_login(role):
        return Response(
            {"detail": "تسجيل الدخول غير مفعّل لهذا الدور على هذه المنصّة"},
            status=status.HTTP_403_FORBIDDEN,
        )
    if getattr(settings, "LOGIN_OTP_DISABLED", False):
        return Response(_issue_tokens(user))
    if not verify_otp(user.email or email, EmailOTP.PURPOSE_LOGIN, code):
        return Response({"detail": "رمز التحقق غير صحيح أو منتهٍ"}, status=400)

    return Response(_issue_tokens(user))
