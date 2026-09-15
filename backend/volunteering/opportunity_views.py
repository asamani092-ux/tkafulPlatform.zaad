"""واجهات تسجيل فرص التطوع العامة + إدارة الاعتماد."""
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from accounts.models import EmailOTP
from accounts.otp import request_otp, verify_otp
from core.permissions import IsAdmin
from core.throttles import AuthRateThrottle

from . import opportunity as opp
from .models import OpportunityRegistration


def _reg_dict(reg: OpportunityRegistration) -> dict:
    return {
        "id": reg.id,
        "project_id": reg.project_id,
        "project_name": reg.project.name,
        "project_slug": reg.project.slug,
        "project_status": reg.project.status,
        "project_end_date": reg.project.end_date,
        "opportunity_ended": opp.opportunity_ended(reg.project),
        "user_id": reg.user_id,
        "full_name": reg.full_name,
        "email": reg.email,
        "phone": reg.phone,
        "national_id": reg.national_id,
        "city": reg.city,
        "gender": reg.gender,
        "age": reg.age,
        "qualification": reg.qualification,
        "source": reg.source,
        "status": reg.status,
        "email_verified_at": reg.email_verified_at,
        "confirmed_at": reg.confirmed_at,
        "reviewed_at": reg.reviewed_at,
        "admin_notes": reg.admin_notes,
        "created_at": reg.created_at,
    }


@api_view(["GET"])
@permission_classes([AllowAny])
def public_opportunity_detail(request, slug):
    try:
        project, profile, config = opp.get_public_volunteer_project(slug)
    except opp.OpportunityError as exc:
        return Response({"detail": exc.message}, status=exc.status)
    return Response(opp.opportunity_payload(project, profile, config))


@api_view(["POST"])
@permission_classes([AllowAny])
@throttle_classes([AuthRateThrottle])
def opportunity_request_otp(request, slug):
    try:
        opp.get_public_volunteer_project(slug)
    except opp.OpportunityError as exc:
        return Response({"detail": exc.message}, status=exc.status)
    email = (request.data.get("email") or "").strip().lower()
    if not email or "@" not in email:
        return Response({"detail": "بريد إلكتروني صالح مطلوب"}, status=400)
    try:
        request_otp(email, EmailOTP.PURPOSE_REGISTER)
    except Exception:
        return Response({"detail": "تعذّر إرسال رمز التحقق"}, status=502)
    return Response({"detail": "تم إرسال رمز التحقق إلى بريدك", "email": email})


@api_view(["POST"])
@permission_classes([AllowAny])
@throttle_classes([AuthRateThrottle])
def opportunity_register_guest(request, slug):
    try:
        project, profile, config = opp.get_public_volunteer_project(slug)
    except opp.OpportunityError as exc:
        return Response({"detail": exc.message}, status=exc.status)

    email = (request.data.get("email") or "").strip().lower()
    code = request.data.get("otp") or request.data.get("code") or ""
    if not verify_otp(email, EmailOTP.PURPOSE_REGISTER, code):
        return Response({"detail": "رمز التحقق غير صحيح أو منتهٍ"}, status=400)

    details = opp.opportunity_payload(project, profile, config)
    try:
        reg = opp.register_guest(project, request.data, details)
    except opp.OpportunityError as exc:
        return Response({"detail": exc.message}, status=exc.status)
    return Response(_reg_dict(reg), status=status.HTTP_201_CREATED)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
@throttle_classes([AuthRateThrottle])
def opportunity_confirm_user(request, slug):
    try:
        project, profile, config = opp.get_public_volunteer_project(slug)
    except opp.OpportunityError as exc:
        return Response({"detail": exc.message}, status=exc.status)

    details = opp.opportunity_payload(project, profile, config)
    try:
        reg = opp.confirm_existing_user(project, request.user, details)
    except opp.OpportunityError as exc:
        return Response({"detail": exc.message}, status=exc.status)
    return Response(_reg_dict(reg), status=status.HTTP_201_CREATED)


@api_view(["GET"])
@permission_classes([IsAdmin])
def admin_opportunity_registrations(request):
    qs = OpportunityRegistration.objects.select_related("project", "user").all()
    project_slug = request.query_params.get("project") or request.query_params.get("slug")
    if project_slug:
        qs = qs.filter(project__slug=project_slug)
    source = request.query_params.get("source")
    if source:
        qs = qs.filter(source=source)
    st = request.query_params.get("status")
    if st:
        qs = qs.filter(status=st)
    return Response({"results": [_reg_dict(r) for r in qs[:500]]})


@api_view(["POST"])
@permission_classes([IsAdmin])
def admin_approve_opportunity_registration(request, registration_id):
    reg = (
        OpportunityRegistration.objects.select_related("project")
        .filter(pk=registration_id)
        .first()
    )
    if not reg:
        return Response({"detail": "التسجيل غير موجود"}, status=404)
    try:
        user = opp.approve_as_user(reg, request.user)
    except opp.OpportunityError as exc:
        return Response({"detail": exc.message}, status=exc.status)
    reg.refresh_from_db()
    data = _reg_dict(reg)
    data["created_user_id"] = user.id
    return Response(data)


@api_view(["POST"])
@permission_classes([IsAdmin])
def admin_reject_opportunity_registration(request, registration_id):
    reg = OpportunityRegistration.objects.select_related("project").filter(pk=registration_id).first()
    if not reg:
        return Response({"detail": "التسجيل غير موجود"}, status=404)
    try:
        opp.reject_registration(reg, request.user, request.data.get("notes") or "")
    except opp.OpportunityError as exc:
        return Response({"detail": exc.message}, status=exc.status)
    reg.refresh_from_db()
    return Response(_reg_dict(reg))
