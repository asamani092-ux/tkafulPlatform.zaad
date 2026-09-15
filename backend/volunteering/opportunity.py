"""
منطق تسجيل فرص التطوع + اعتماد الزائر كمستخدم بعد انتهاء الفرصة.
التعقيد: التأكيد/التسجيل O(1)؛ القائمة O(n)؛ الاعتماد O(1) مع فحوص تفرّد.
"""
from __future__ import annotations

from django.conf import settings
from django.contrib.auth.models import User
from django.core.mail import send_mail
from django.db import IntegrityError, transaction
from django.utils import timezone

from accounts.models import Profile
from projects.lifecycle import PUBLIC_STATUSES
from projects.models import Project

from .models import OpportunityRegistration, VolunteeringProfile


class OpportunityError(Exception):
    def __init__(self, message: str, status: int = 400):
        self.message = message
        self.status = status
        super().__init__(message)


def normalize_phone(phone: str) -> str:
    digits = "".join(c for c in (phone or "") if c.isdigit())
    if digits.startswith("966") and len(digits) > 9:
        digits = digits[3:]
    if digits.startswith("0") and len(digits) == 10:
        digits = digits[1:]
    return digits


def get_public_volunteer_project(slug: str) -> tuple[Project, VolunteeringProfile, dict]:
    project = (
        Project.objects.filter(slug=slug, is_active=True, status__in=PUBLIC_STATUSES)
        .prefetch_related("tools")
        .first()
    )
    if not project:
        raise OpportunityError("المشروع غير موجود", 404)

    tool = next(
        (t for t in project.tools.all() if t.tool_key == "volunteering" and t.is_enabled),
        None,
    )
    if not tool:
        raise OpportunityError("أداة التطوع غير مفعّلة لهذا المشروع", 404)

    config = tool.config or {}
    if config.get("show_opportunities") is False:
        raise OpportunityError("فرص التطوع غير ظاهرة لهذا المشروع", 404)

    profile = VolunteeringProfile.objects.filter(project=project).first()
    if profile and profile.is_hidden:
        raise OpportunityError("الفرصة غير متاحة حالياً", 404)
    if not profile:
        profile = VolunteeringProfile(project=project)
    return project, profile, config


def opportunity_payload(project: Project, profile: VolunteeringProfile, config: dict) -> dict:
    return {
        "project_id": project.id,
        "slug": project.slug,
        "name": project.name,
        "description": project.description,
        "start_date": project.start_date,
        "end_date": project.end_date,
        "location": config.get("location") or profile.location or "",
        "requirements": config.get("requirements") or profile.implementation_requirements or "",
        "estimated_hours": config.get("estimated_hours", profile.estimated_hours or 0),
        "duration": config.get("duration") or profile.duration or "",
        "show_opportunities": config.get("show_opportunities", True),
    }


def _send_confirmation_email(reg: OpportunityRegistration, details: dict) -> None:
    body = (
        f"تم تأكيد تسجيلك في فرصة التطوع «{details.get('name')}».\n\n"
        f"الموقع: {details.get('location') or '—'}\n"
        f"الساعات المقدّرة: {details.get('estimated_hours') or '—'}\n"
        f"المدة: {details.get('duration') or '—'}\n"
        f"تاريخ البداية: {details.get('start_date') or '—'}\n"
        f"تاريخ النهاية: {details.get('end_date') or '—'}\n"
        f"المتطلبات: {details.get('requirements') or '—'}\n"
    )
    try:
        send_mail(
            f"تأكيد التسجيل — {details.get('name')}",
            body,
            getattr(settings, "DEFAULT_FROM_EMAIL", "no-reply@alzad.org"),
            [reg.email],
            fail_silently=True,
        )
    except Exception:
        pass


def _assert_no_duplicate(project: Project, national_id: str, phone: str) -> None:
    phone_n = normalize_phone(phone)
    national_id = (national_id or "").strip()
    exists = (
        OpportunityRegistration.objects.filter(
            project=project, national_id=national_id, phone=phone_n
        )
        .exclude(status=OpportunityRegistration.STATUS_REJECTED)
        .exists()
    )
    if exists:
        raise OpportunityError("لديك تسجيل سابق على هذه الفرصة بنفس رقم الهوية والجوال")


def confirm_existing_user(project: Project, user: User, details: dict) -> OpportunityRegistration:
    profile = getattr(user, "profile", None)
    if not profile:
        raise OpportunityError("الملف الشخصي غير مكتمل")
    national_id = (profile.national_id or "").strip()
    phone = normalize_phone(profile.phone or "")
    if not national_id or not phone:
        raise OpportunityError("أكمل رقم الهوية والجوال في ملفك قبل التأكيد")
    _assert_no_duplicate(project, national_id, phone)
    try:
        reg = OpportunityRegistration.objects.create(
            project=project,
            user=user,
            full_name=profile.name or user.get_full_name() or user.email,
            email=user.email,
            phone=phone,
            national_id=national_id,
            city=profile.city or "",
            gender=profile.gender or "",
            age=profile.age,
            qualification=profile.qualification or "",
            source=OpportunityRegistration.SOURCE_EXISTING,
            status=OpportunityRegistration.STATUS_CONFIRMED,
            email_verified_at=timezone.now(),
            confirmed_at=timezone.now(),
        )
    except IntegrityError as exc:
        raise OpportunityError("لديك تسجيل سابق على هذه الفرصة بنفس رقم الهوية والجوال") from exc
    _send_confirmation_email(reg, details)
    return reg


def register_guest(project: Project, data: dict, details: dict) -> OpportunityRegistration:
    national_id = (data.get("national_id") or "").strip()
    phone = normalize_phone(data.get("phone") or "")
    email = (data.get("email") or "").strip().lower()
    full_name = (data.get("full_name") or "").strip()
    if not all([national_id, phone, email, full_name]):
        raise OpportunityError("الاسم والبريد والجوال ورقم الهوية مطلوبة")
    if len(phone) != 9 or not phone.startswith("5"):
        raise OpportunityError("رقم الجوال غير صالح")
    _assert_no_duplicate(project, national_id, phone)
    try:
        reg = OpportunityRegistration.objects.create(
            project=project,
            user=None,
            full_name=full_name,
            email=email,
            phone=phone,
            national_id=national_id,
            city=(data.get("city") or "")[:100],
            gender=(data.get("gender") or "")[:10],
            age=data.get("age") or None,
            qualification=(data.get("qualification") or "")[:100],
            source=OpportunityRegistration.SOURCE_GUEST,
            status=OpportunityRegistration.STATUS_CONFIRMED,
            email_verified_at=timezone.now(),
            confirmed_at=timezone.now(),
        )
    except IntegrityError as exc:
        raise OpportunityError("لديك تسجيل سابق على هذه الفرصة بنفس رقم الهوية والجوال") from exc
    _send_confirmation_email(reg, details)
    return reg


def opportunity_ended(project: Project) -> bool:
    if project.status in ("completed", "archived"):
        return True
    if project.end_date and project.end_date < timezone.localdate():
        return True
    profile = VolunteeringProfile.objects.filter(project=project).first()
    if profile and profile.volunteer_status in ("COMPLETED", "CANCELLED"):
        return True
    return False


@transaction.atomic
def approve_as_user(reg: OpportunityRegistration, reviewer: User) -> User:
    if reg.source != OpportunityRegistration.SOURCE_GUEST:
        raise OpportunityError("هذا التسجيل مرتبط بمستخدم موجود مسبقاً")
    if reg.status != OpportunityRegistration.STATUS_CONFIRMED:
        raise OpportunityError("لا يمكن اعتماد تسجيل غير مؤكَّد")
    if not opportunity_ended(reg.project):
        raise OpportunityError("اعتماد المستخدم متاح فقط بعد انتهاء الفرصة")

    if Profile.objects.filter(national_id=reg.national_id).exclude(national_id="").exists():
        raise OpportunityError("رقم الهوية مرتبط بحساب موجود")
    if Profile.objects.filter(phone=reg.phone).exclude(phone="").exists():
        raise OpportunityError("رقم الجوال مرتبط بحساب موجود")
    if User.objects.filter(email__iexact=reg.email).exists():
        raise OpportunityError("البريد الإلكتروني مسجّل مسبقاً")

    from django.utils.crypto import get_random_string

    user = User.objects.create_user(
        username=reg.email.lower(),
        email=reg.email.lower(),
        password=get_random_string(12),
    )
    profile = user.profile
    profile.name = reg.full_name
    profile.phone = reg.phone
    profile.national_id = reg.national_id
    profile.city = reg.city
    profile.gender = reg.gender
    profile.age = reg.age
    profile.qualification = reg.qualification
    profile.is_approved = True
    profile.must_reset_password = True
    profile.external_source = "opportunity_registration"
    profile.save()

    reg.user = user
    reg.status = OpportunityRegistration.STATUS_APPROVED
    reg.reviewed_at = timezone.now()
    reg.reviewed_by = reviewer
    reg.save(update_fields=["user", "status", "reviewed_at", "reviewed_by", "updated_at"])
    return user


def reject_registration(reg: OpportunityRegistration, reviewer: User, notes: str = "") -> None:
    if reg.status == OpportunityRegistration.STATUS_APPROVED:
        raise OpportunityError("لا يمكن رفض تسجيل معتمد")
    reg.status = OpportunityRegistration.STATUS_REJECTED
    reg.reviewed_at = timezone.now()
    reg.reviewed_by = reviewer
    reg.admin_notes = notes or reg.admin_notes
    reg.save(update_fields=["status", "reviewed_at", "reviewed_by", "admin_notes", "updated_at"])
