"""
منطق ملف المشروع: إنشاء، بوابات مراحل، أنشطة، اعتماد.
التعقيد: bootstrap O(S)؛ submit/approve مرحلة O(1) + تحقق أقسام المرحلة O(F).
"""
from __future__ import annotations

import secrets
from datetime import date, timedelta
from decimal import Decimal

from django.contrib.auth.models import User
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied, ValidationError

from core.activity import log_activity
from core.permissions import is_super_admin

from . import sections as catalog
from .emails import send_approval_email
from .models import (
    ApprovalRequest,
    BudgetLine,
    BudgetTxn,
    DossierAttachment,
    DossierSection,
    DossierStage,
    DossierWorkspace,
    ProjectDossier,
    StageActivity,
)

ACTION_DOSSIER_CREATE = "dossier_create"
ACTION_STAGE_SUBMIT = "dossier_stage_submit"
ACTION_STAGE_APPROVE = "dossier_stage_approve"
ACTION_STAGE_RETURN = "dossier_stage_return"
ACTION_APPROVAL_DECIDE = "dossier_approval_decide"


def _user_display_name(user: User | None) -> str:
    if not user:
        return ""
    profile = getattr(user, "profile", None)
    name = (getattr(profile, "name", "") or "").strip() if profile else ""
    return name or (user.get_full_name() or "").strip() or (user.email or "")


def _resolve_user_ref(*, user_id=None, email: str = "", name: str = "") -> tuple[User | None, str, str]:
    """يرجع (مستخدم، اسم، بريد). O(1)."""
    user = None
    if user_id is not None and user_id != "":
        user = User.objects.filter(pk=user_id).select_related("profile").first()
        if not user:
            raise ValidationError({"user_id": "مستخدم غير موجود"})
    email_clean = (email or "").strip()
    name_clean = (name or "").strip()
    if user:
        return user, name_clean or _user_display_name(user), email_clean or (user.email or "")
    if email_clean:
        found = User.objects.filter(email__iexact=email_clean).select_related("profile").first()
        if found:
            return found, name_clean or _user_display_name(found), email_clean
    return None, name_clean, email_clean


def _default_platform_admin(actor: User | None) -> User:
    """صاحب الاعتماد الافتراضي: المنشئ إن كان مدير نظام، وإلا أول مدير نظام. O(1)."""
    if actor is not None and getattr(actor, "is_authenticated", False) and is_super_admin(actor):
        return actor
    admin = (
        User.objects.filter(profile__role="admin")
        .select_related("profile")
        .order_by("id")
        .first()
    )
    if not admin:
        raise ValidationError(
            {"approver_email": "لا يوجد مدير نظام لتعيينه صاحب اعتماد افتراضي"}
        )
    return admin


TEAM_CANDIDATE_ROLES = ("employee", "user")


def ensure_project_membership(project, user: User | None, *, role: str = "project_viewer") -> None:
    """إضافة عضوية مشروع إن لم تكن موجودة — دون تخفيض دور أعلى. O(1)."""
    if not user or not getattr(user, "id", None):
        return
    from projects.models import ProjectMember

    existing = ProjectMember.objects.filter(project=project, user=user).first()
    if existing:
        return
    ProjectMember.objects.create(project=project, user=user, role=role)


def _user_keeps_project_access(dossier: ProjectDossier, user_id: int | None) -> bool:
    """هل ما زال للمستخدم دور على الحاوية (راعي/مدير/معتمد/فريق)؟ O(R)."""
    if not user_id:
        return False
    if dossier.sponsor_id == user_id:
        return True
    if dossier.manager_id == user_id:
        return True
    if dossier.approver_id == user_id:
        return True
    return user_id in team_section_user_ids(dossier)


def revoke_project_membership_if_unused(dossier: ProjectDossier, user: User | None) -> None:
    """سحب عضوية إن لم يبقَ للمستخدم دور على المشروع. O(1)."""
    if not user or not getattr(user, "id", None):
        return
    if _user_keeps_project_access(dossier, user.id):
        return
    from projects.models import ProjectMember

    ProjectMember.objects.filter(project=dossier.project, user=user).delete()


def link_dossier_role_users_from_email(dossier: ProjectDossier) -> list[str]:
    """يربط FK من البريد إن غاب المعرف. يعيد أسماء الحقول التي تغيّرت. O(1)."""
    changed: list[str] = []
    if not dossier.sponsor_id and (dossier.sponsor_email or "").strip():
        user, name, email = _resolve_user_ref(
            email=dossier.sponsor_email, name=dossier.sponsor_name or ""
        )
        if user:
            dossier.sponsor = user
            if name:
                dossier.sponsor_name = name
            if email:
                dossier.sponsor_email = email
            changed.extend(["sponsor", "sponsor_name", "sponsor_email"])
    if not dossier.manager_id and (dossier.manager_email or "").strip():
        user, _name, email = _resolve_user_ref(email=dossier.manager_email)
        if user:
            dossier.manager = user
            if email:
                dossier.manager_email = email
            changed.extend(["manager", "manager_email"])
    if not dossier.approver_id and (dossier.approver_email or "").strip():
        user, name, email = _resolve_user_ref(
            email=dossier.approver_email, name=dossier.approver_name or ""
        )
        if user:
            dossier.approver = user
            if name:
                dossier.approver_name = name
            if email:
                dossier.approver_email = email
            changed.extend(["approver", "approver_name", "approver_email"])
    return changed


def transfer_dossier_sponsor(
    dossier: ProjectDossier,
    *,
    user_id=None,
    email: str = "",
    name: str = "",
    clear: bool = False,
) -> ProjectDossier:
    """
    نقل حاوية المشروع لراعٍ جديد: عضوية فورية وسحب عن السابق إن لم يبقَ له دور.
    لا تُنسخ الأقسام/الأنشطة — نفس Project وDossier. O(1).
    """
    old = dossier.sponsor
    old_id = dossier.sponsor_id
    if clear:
        dossier.sponsor = None
        if name:
            dossier.sponsor_name = name
        if email:
            dossier.sponsor_email = (email or "").strip()
        elif not name:
            dossier.sponsor_name = ""
            dossier.sponsor_email = ""
    else:
        sponsor, s_name, s_email = _resolve_user_ref(
            user_id=user_id, email=email, name=name
        )
        dossier.sponsor = sponsor
        dossier.sponsor_name = s_name
        dossier.sponsor_email = s_email
    dossier.save(update_fields=["sponsor", "sponsor_name", "sponsor_email", "updated_at"])
    if dossier.sponsor_id:
        ensure_project_membership(dossier.project, dossier.sponsor, role="project_editor")
    if old_id and old_id != dossier.sponsor_id:
        revoke_project_membership_if_unused(dossier, old)
    return dossier


def transfer_dossier_manager(
    dossier: ProjectDossier,
    *,
    user_id=None,
    email: str = "",
    name: str = "",
    clear: bool = False,
) -> ProjectDossier:
    """تعيين مدير المشروع مع عضوية project_editor. O(1)."""
    old = dossier.manager
    old_id = dossier.manager_id
    if clear:
        dossier.manager = None
        if email:
            dossier.manager_email = (email or "").strip()
        elif not name:
            dossier.manager_email = ""
    else:
        manager, _m_name, m_email = _resolve_user_ref(user_id=user_id, email=email, name=name)
        dossier.manager = manager
        dossier.manager_email = m_email or (manager.email if manager else "")
    dossier.save(update_fields=["manager", "manager_email", "updated_at"])
    if dossier.manager_id:
        ensure_project_membership(dossier.project, dossier.manager, role="project_editor")
    if old_id and old_id != dossier.manager_id:
        revoke_project_membership_if_unused(dossier, old)
    return dossier


def can_assign_dossier_manager(user, dossier: ProjectDossier) -> bool:
    """تعيين مدير المشروع: مشرف أو مدير الإدارة (الراعي). O(1)."""
    if not user or not user.is_authenticated:
        return False
    if is_super_admin(user):
        return True
    if dossier.sponsor_id == user.id:
        return True
    return _email_matches(user, dossier.sponsor_email)


def sync_dossier_role_memberships(dossier: ProjectDossier) -> None:
    """شفاء ربط الأدوار من البريد + ضمان عضوية الراعي/المدير/المعتمد. O(1)."""
    changed = link_dossier_role_users_from_email(dossier)
    if changed:
        fields = list(dict.fromkeys([*changed, "updated_at"]))
        dossier.save(update_fields=fields)
    project = dossier.project
    if dossier.sponsor_id:
        ensure_project_membership(project, dossier.sponsor, role="project_editor")
    if dossier.manager_id:
        ensure_project_membership(project, dossier.manager, role="project_editor")
    if dossier.approver_id:
        ensure_project_membership(project, dossier.approver, role="project_viewer")


def team_section_user_ids(dossier: ProjectDossier) -> set[int]:
    """معرّفات مستخدمي قسم فريق العمل. O(R)."""
    sec = dossier.sections.filter(kind="document", key="team").first()
    data = (sec.data if sec else {}) or {}
    ids: set[int] = set()
    for row in data.get("rows") or []:
        if not isinstance(row, dict):
            continue
        raw = row.get("user_id")
        try:
            uid = int(raw)
        except (TypeError, ValueError):
            continue
        if uid:
            ids.add(uid)
    return ids


def sync_team_memberships(dossier: ProjectDossier) -> int:
    """إنشاء عضوية لكل عضو فريق عمل مسجّل. O(R)."""
    from projects.models import ProjectMember

    ids = team_section_user_ids(dossier)
    if not ids:
        return 0
    users = {
        u.id: u
        for u in User.objects.filter(id__in=ids, is_active=True).select_related("profile")
    }
    created = 0
    for uid in ids:
        user = users.get(uid)
        if not user:
            continue
        role = getattr(getattr(user, "profile", None), "role", "") or ""
        if role not in TEAM_CANDIDATE_ROLES and role not in ("manager", "admin"):
            continue
        _, was_created = ProjectMember.objects.get_or_create(
            project=dossier.project,
            user=user,
            defaults={"role": "project_viewer"},
        )
        if was_created:
            created += 1
    return created


def team_candidates_queryset():
    """موظفون ومتطوّعون نشطون لاختيار فريق العمل. O(U)."""
    return (
        User.objects.filter(is_active=True, profile__role__in=TEAM_CANDIDATE_ROLES)
        .select_related("profile")
        .order_by("id")
    )


def notify_activity_assigned(*, activity: StageActivity, assignee: User) -> None:
    """إشعار منصة + بريد عند إسناد مهمة. O(1)."""
    try:
        from notifications.services import EVENT_PROJECT, notify

        dossier = activity.stage.dossier
        project = dossier.project
        slug = project.slug
        role = getattr(getattr(assignee, "profile", None), "role", "") or ""
        if role in ("employee", "manager", "admin"):
            link = f"/Admin/projects/{slug}/dossier"
        else:
            link = "/user/my-tasks"
        message = f"أُسندت إليك مهمة «{activity.title}» في مشروع «{project.name}»."
        notify(
            message=message,
            users=[assignee],
            notification_type="info",
            link=link,
            event_type=EVENT_PROJECT,
            email_subject="مهمة مسندة إليك",
        )
    except Exception:
        pass


def apply_activity_assignment(
    activity: StageActivity,
    *,
    dossier: ProjectDossier,
    responsible_user_id,
) -> StageActivity:
    """تعيين مسند إليه من فريق العمل فقط ومزامنة الاسم + إشعار. O(1)."""
    prev_id = activity.responsible_user_id
    if responsible_user_id in (None, ""):
        activity.responsible_user = None
        activity.responsible = ""
        return activity
    try:
        uid = int(responsible_user_id)
    except (TypeError, ValueError):
        raise ValidationError({"responsible_user": "معرّف مسند إليه غير صالح"})
    if uid not in team_section_user_ids(dossier):
        raise ValidationError({"responsible_user": "المسند إليه يجب أن يكون من فريق العمل"})
    user = User.objects.filter(pk=uid, is_active=True).select_related("profile").first()
    if not user:
        raise ValidationError({"responsible_user": "مستخدم غير موجود"})
    activity.responsible_user = user
    activity.responsible = _user_display_name(user)
    if prev_id != user.id:
        notify_activity_assigned(activity=activity, assignee=user)
    return activity


def assert_can_work_assigned_activity(user, dossier: ProjectDossier, activity: StageActivity) -> None:
    """تحرير كامل أو مسند إليه للمهمة. O(1)."""
    if is_super_admin(user) or can_edit_dossier(user, dossier):
        return
    if activity.responsible_user_id and activity.responsible_user_id == getattr(user, "id", None):
        return
    raise PermissionDenied("ليست لديك صلاحية على هذه المهمة")


def next_dossier_code(year: int | None = None) -> str:
    """رمز داخلي فريد PRJ-YYYY-NNNN. O(1) تقريباً مع فهرس code."""
    y = year or timezone.now().year
    prefix = f"PRJ-{y}-"
    last = (
        ProjectDossier.objects.filter(code__startswith=prefix)
        .order_by("-code")
        .values_list("code", flat=True)
        .first()
    )
    n = 1
    if last:
        try:
            n = int(last.rsplit("-", 1)[-1]) + 1
        except ValueError:
            n = ProjectDossier.objects.filter(code__startswith=prefix).count() + 1
    return f"{prefix}{n:04d}"



def compute_auto_status(activity: StageActivity, today: date | None = None) -> str:
    """حالة تلقائية من التواريخ والحالة اليدوية. O(1)."""
    today = today or timezone.localdate()
    if activity.manual_status == "done" or (activity.progress_pct or 0) >= 100:
        return "done"
    if activity.manual_status == "in_progress":
        if activity.end_date and today > activity.end_date:
            return "delayed"
        return "in_progress"
    if activity.start_date and today < activity.start_date:
        return "not_due"
    if activity.end_date and today > activity.end_date and (activity.progress_pct or 0) < 100:
        return "delayed"
    if activity.start_date and activity.start_date <= today:
        return "in_progress"
    return "not_due"


def refresh_activity_auto_status(activity: StageActivity, save: bool = True) -> StageActivity:
    activity.auto_status = compute_auto_status(activity)
    if save:
        activity.save(update_fields=["auto_status", "updated_at"])
    return activity


_DATE_ORDER_MSG = "تاريخ البداية يجب أن يسبق تاريخ الإغلاق"


def _coerce_date(value) -> date | None:
    if value in (None, ""):
        return None
    if isinstance(value, date):
        return value
    return date.fromisoformat(str(value)[:10])


def activity_is_done(activity: StageActivity) -> bool:
    return activity.manual_status == "done" or (activity.progress_pct or 0) >= 100


def validate_activity_date_window(
    *,
    start,
    end,
    stage: DossierStage | None = None,
    parent: StageActivity | None = None,
    activity: StageActivity | None = None,
) -> None:
    """تحقق تسلسل التواريخ وانتماء النشاط لنطاق المرحلة أو النشاط الرئيسي."""
    start_d = _coerce_date(start)
    end_d = _coerce_date(end)
    if start_d and end_d and start_d >= end_d:
        raise ValidationError({"detail": _DATE_ORDER_MSG})

    eff_start = start_d if start_d is not None else (activity.start_date if activity else None)
    eff_end = end_d if end_d is not None else (activity.end_date if activity else None)
    if not eff_start and not eff_end:
        return

    if parent is not None or (activity and activity.parent_id):
        par = parent or (activity.parent if activity else None)
        if not par:
            return
        if not (par.start_date and par.end_date):
            raise ValidationError({"detail": "حدّد تواريخ النشاط الرئيسي قبل تواريخ النشاط الفرعي"})
        if eff_start and eff_start < par.start_date:
            raise ValidationError({"detail": "تاريخ بداية النشاط الفرعي خارج نطاق النشاط الرئيسي"})
        if eff_end and eff_end > par.end_date:
            raise ValidationError({"detail": "تاريخ إغلاق النشاط الفرعي خارج نطاق النشاط الرئيسي"})
        if eff_start and eff_start > par.end_date:
            raise ValidationError({"detail": "تاريخ بداية النشاط الفرعي خارج نطاق النشاط الرئيسي"})
        if eff_end and eff_end < par.start_date:
            raise ValidationError({"detail": "تاريخ إغلاق النشاط الفرعي خارج نطاق النشاط الرئيسي"})
        return

    st = stage or (activity.stage if activity else None)
    if not st:
        return
    if not (st.planned_start and st.planned_end):
        raise ValidationError({"detail": "حدّد تواريخ المرحلة قبل تواريخ النشاط الرئيسي"})
    if eff_start and eff_start < st.planned_start:
        raise ValidationError({"detail": "تاريخ بداية النشاط الرئيسي خارج نطاق المرحلة"})
    if eff_end and eff_end > st.planned_end:
        raise ValidationError({"detail": "تاريخ إغلاق النشاط الرئيسي خارج نطاق المرحلة"})
    if eff_start and eff_start > st.planned_end:
        raise ValidationError({"detail": "تاريخ بداية النشاط الرئيسي خارج نطاق المرحلة"})
    if eff_end and eff_end < st.planned_start:
        raise ValidationError({"detail": "تاريخ إغلاق النشاط الرئيسي خارج نطاق المرحلة"})


def validate_parent_dates_cover_children(
    activity: StageActivity,
    start,
    end,
    *,
    start_in_payload: bool = False,
    end_in_payload: bool = False,
) -> None:
    """يرفض تضييق النشاط الرئيسي إذا بقي فرعي خارج النطاق."""
    if activity.parent_id is not None:
        return
    new_start = _coerce_date(start) if start_in_payload else activity.start_date
    new_end = _coerce_date(end) if end_in_payload else activity.end_date
    if new_start is None and new_end is None:
        return
    for child in StageActivity.objects.filter(parent=activity):
        if child.start_date and new_start and child.start_date < new_start:
            raise ValidationError({"detail": "تعديل تواريخ النشاط الرئيسي يترك نشاطاً فرعياً خارج النطاق"})
        if child.end_date and new_end and child.end_date > new_end:
            raise ValidationError({"detail": "تعديل تواريخ النشاط الرئيسي يترك نشاطاً فرعياً خارج النطاق"})
        if child.start_date and new_end and child.start_date > new_end:
            raise ValidationError({"detail": "تعديل تواريخ النشاط الرئيسي يترك نشاطاً فرعياً خارج النطاق"})
        if child.end_date and new_start and child.end_date < new_start:
            raise ValidationError({"detail": "تعديل تواريخ النشاط الرئيسي يترك نشاطاً فرعياً خارج النطاق"})


def validate_stage_planned_window(stage: DossierStage, planned_start, planned_end) -> None:
    """يرفض تضييق المرحلة إذا بقي نشاط خارج النطاق."""
    new_start = _coerce_date(planned_start)
    new_end = _coerce_date(planned_end)
    if new_start and new_end and new_start >= new_end:
        raise ValidationError({"detail": _DATE_ORDER_MSG})
    if new_start is None and new_end is None:
        return
    mains = StageActivity.objects.filter(stage=stage, parent__isnull=True)
    for main in mains:
        if main.start_date and new_start and main.start_date < new_start:
            raise ValidationError({"detail": "تعديل تواريخ المرحلة يترك نشاطاً رئيسياً خارج النطاق"})
        if main.end_date and new_end and main.end_date > new_end:
            raise ValidationError({"detail": "تعديل تواريخ المرحلة يترك نشاطاً رئيسياً خارج النطاق"})
        if main.start_date and new_end and main.start_date > new_end:
            raise ValidationError({"detail": "تعديل تواريخ المرحلة يترك نشاطاً رئيسياً خارج النطاق"})
        if main.end_date and new_start and main.end_date < new_start:
            raise ValidationError({"detail": "تعديل تواريخ المرحلة يترك نشاطاً رئيسياً خارج النطاق"})
        for child in StageActivity.objects.filter(parent=main):
            if child.start_date and new_start and child.start_date < new_start:
                raise ValidationError({"detail": "تعديل تواريخ المرحلة يترك نشاطاً فرعياً خارج النطاق"})
            if child.end_date and new_end and child.end_date > new_end:
                raise ValidationError({"detail": "تعديل تواريخ المرحلة يترك نشاطاً فرعياً خارج النطاق"})


def assert_can_complete_parent_activity(activity: StageActivity) -> None:
    """لا يُكمَل النشاط الرئيسي قبل إتمام كل الفروع."""
    if activity.parent_id is not None:
        return
    children = StageActivity.objects.filter(parent=activity)
    if not children.exists():
        return
    if any(not activity_is_done(child) for child in children):
        raise ValidationError({"detail": "لا يمكن إتمام النشاط الرئيسي قبل إتمام جميع الأنشطة الفرعية"})


def activity_week_starts(start, end) -> set[str]:
    """بدايات الأسابيع الأربعة لكل شهر داخل نطاق النشاط. O(M)."""
    s = _coerce_date(start)
    e = _coerce_date(end)
    if not s or not e or s >= e:
        return set()
    y, m = s.year, s.month
    end_y, end_m = e.year, e.month
    found: set[str] = set()
    while (y, m) <= (end_y, end_m):
        for day in (1, 8, 15, 22):
            found.add(f"{y:04d}-{m:02d}-{day:02d}")
        m += 1
        if m > 12:
            m = 1
            y += 1
    return found


@transaction.atomic
def create_dossier_for_project(
    *,
    project,
    actor: User | None,
    card: dict | None = None,
    request=None,
) -> ProjectDossier:
    """ينشئ الملف مع أقسام فارغة ومراحل. O(S)."""
    if hasattr(project, "dossier"):
        raise ValidationError({"project": "يوجد ملف مشروع مسبقاً"})
    card = card or {}
    manager_id = card.get("manager_id")
    manager = None
    if manager_id:
        manager = User.objects.filter(pk=manager_id).select_related("profile").first()
        if not manager:
            raise ValidationError({"manager_id": "مستخدم غير موجود"})

    sponsor, sponsor_name, sponsor_email = _resolve_user_ref(
        user_id=card.get("sponsor_id"),
        email=card.get("sponsor_email") or "",
        name=card.get("sponsor_name") or "",
    )
    approver, approver_name, approver_email = _resolve_user_ref(
        user_id=card.get("approver_id"),
        email=card.get("approver_email") or "",
        name=card.get("approver_name") or "",
    )
    if not approver_email and not approver:
        admin = _default_platform_admin(actor)
        approver, approver_name, approver_email = (
            admin,
            _user_display_name(admin),
            (admin.email or "").strip(),
        )
        if not approver_email:
            raise ValidationError(
                {"approver_email": "لا يوجد مدير نظام لتعيينه صاحب اعتماد افتراضي"}
            )

    budget_a = Decimal(str(card.get("budget_association") or 0))
    budget_d = Decimal(str(card.get("budget_donation") or 0))
    dossier = ProjectDossier.objects.create(
        project=project,
        code=card.get("code") or next_dossier_code(),
        marketing_name=card.get("marketing_name") or project.name,
        portfolio=card.get("portfolio") or "",
        department=card.get("department") or "",
        section=card.get("section") or "",
        strategic_goal=card.get("strategic_goal") or "",
        location=card.get("location") or "",
        projects_office_name=card.get("projects_office_name") or "",
        projects_committee_name=card.get("projects_committee_name") or "",
        sponsor=sponsor,
        sponsor_name=sponsor_name,
        sponsor_email=sponsor_email,
        approver=approver,
        approver_name=approver_name,
        approver_email=approver_email,
        execution_start=card.get("execution_start") or None,
        execution_end=card.get("execution_end") or None,
        manager=manager,
        manager_email=card.get("manager_email") or (manager.email if manager else ""),
        current_stage="define",
        status="in_progress",
        budget_association=budget_a,
        budget_donation=budget_d,
        budget_total=budget_a + budget_d,
    )
    section_rows = []
    for kind, keys in (
        ("card", catalog.all_section_keys("card")),
        ("document", catalog.all_section_keys("document")),
        ("plan", catalog.plan_phase_keys()),
        ("closure", catalog.all_section_keys("closure")),
        ("approvals", catalog.all_section_keys("approvals")),
    ):
        for key in keys:
            section_rows.append(DossierSection(dossier=dossier, kind=kind, key=key, data={}, status="empty"))
    DossierSection.objects.bulk_create(section_rows)

    stage_rows = []
    for s in catalog.STAGES:
        # مراحل المحتوى مؤشر مكان فقط — كلها مفتوحة؛ الاعتماد على التبويبات
        stage_rows.append(
            DossierStage(
                dossier=dossier,
                order=s["order"],
                key=s["key"],
                status="approved",
            )
        )
    DossierStage.objects.bulk_create(stage_rows)

    ws_rows = []
    for w in catalog.WORKSPACES:
        if w["key"] == "card":
            status = "active"
        else:
            status = "locked"
        ws_rows.append(
            DossierWorkspace(
                dossier=dossier,
                order=w["order"],
                key=w["key"],
                status=status,
            )
        )
    DossierWorkspace.objects.bulk_create(ws_rows)

    sync_document_from_card(dossier)
    sync_dossier_role_memberships(dossier)

    log_activity(
        actor=actor,
        action=ACTION_DOSSIER_CREATE,
        summary=f"إنشاء ملف مشروع {dossier.code}",
        request=request,
        target=dossier,
    )
    return dossier


def ensure_plan_phase_sections(dossier: ProjectDossier) -> None:
    """أقسام اعتماد المراحل الخمس في الخطة. O(P)."""
    existing = set(dossier.sections.filter(kind="plan").values_list("key", flat=True))
    rows = [
        DossierSection(dossier=dossier, kind="plan", key=key, data={}, status="empty")
        for key in catalog.plan_phase_keys()
        if key not in existing
    ]
    if rows:
        DossierSection.objects.bulk_create(rows)


def _next_activity_code(dossier: ProjectDossier) -> str:
    n = StageActivity.objects.filter(stage__dossier=dossier).count() + 1
    return f"ACT-{n}"


@transaction.atomic
def sync_plan_from_document(dossier: ProjectDossier) -> None:
    """ينسخ أنشطة المراحل الرئيسية إلى الخطة دون حذف أو الكتابة فوق الموجود. O(P+A)."""
    ensure_plan_phase_sections(dossier)
    phase_rows = document_main_phase_rows(dossier)
    stages = {s.key: s for s in dossier.stages.all()}
    existing = StageActivity.objects.filter(stage__dossier=dossier, parent__isnull=True)
    seen = {(a.stage_id, (a.title or "").strip()) for a in existing}
    pending: list[StageActivity] = []
    base = StageActivity.objects.filter(stage__dossier=dossier).count()
    for phase in phase_rows:
        if not isinstance(phase, dict):
            continue
        stage = stages.get(str(phase.get("key") or ""))
        if not stage:
            continue
        for raw in phase.get("activities") or []:
            title = str(raw or "").strip()
            if not title or (stage.id, title) in seen:
                continue
            seen.add((stage.id, title))
            base += 1
            pending.append(
                StageActivity(
                    stage=stage,
                    code=f"ACT-{base}",
                    title=title,
                    source="document",
                    locked=True,
                )
            )
    if pending:
        StageActivity.objects.bulk_create(pending)
    for key in catalog.plan_phase_keys():
        stage = stages.get(key)
        sec = dossier.sections.filter(kind="plan", key=key).first()
        if not stage or not sec or sec.status == "approved":
            continue
        has = StageActivity.objects.filter(stage=stage).exists()
        if has and sec.status == "empty":
            sec.status = "filled"
            sec.save(update_fields=["status", "updated_at"])


def ensure_document_sections(dossier: ProjectDossier) -> None:
    """إنشاء أقسام الوثيقة الناقصة وفق الكتالوج الحالي. O(S)."""
    existing = set(dossier.sections.filter(kind="document").values_list("key", flat=True))
    to_create = []
    for key in catalog.all_section_keys("document"):
        if key in existing:
            continue
        to_create.append(DossierSection(dossier=dossier, kind="document", key=key, data={}, status="empty"))
    if to_create:
        DossierSection.objects.bulk_create(to_create)


def ensure_approvals_sections(dossier: ProjectDossier) -> None:
    existing = set(dossier.sections.filter(kind="approvals").values_list("key", flat=True))
    rows = [
        DossierSection(dossier=dossier, kind="approvals", key=key, data={}, status="empty")
        for key in catalog.all_section_keys("approvals")
        if key not in existing
    ]
    if rows:
        DossierSection.objects.bulk_create(rows)


def ensure_workspaces_catalog(dossier: ProjectDossier) -> None:
    """ضمان تبويب الاعتمادات وترتيب اللوحة. O(W)."""
    by_key = {w.key: w for w in dossier.workspaces.all()}
    if "approvals" not in by_key:
        board = by_key.get("board")
        if board and board.order <= 5:
            board.order = 6
            board.save(update_fields=["order", "updated_at"])
        closure = by_key.get("closure")
        status = "active" if closure and closure.status == "approved" else "locked"
        DossierWorkspace.objects.create(dossier=dossier, order=5, key="approvals", status=status)


def _framework_bundle_data_from_legacy(dossier: ProjectDossier, current: dict) -> dict:
    """دمج أقسام الوثيقة القديمة في framework_bundle دون مسح الموجود. O(1)."""
    data = dict(current or {})
    legacy_map = (
        ("logical_impact", "logical_impact", "rows"),
        ("outputs_quality", "outputs_quality", "rows"),
        ("main_phases", "main_phases", "phases"),
    )
    for old_key, dest_key, inner in legacy_map:
        if data.get(dest_key):
            continue
        old_sec = dossier.sections.filter(kind="document", key=old_key).first()
        if not old_sec or not old_sec.data:
            continue
        od = old_sec.data or {}
        if inner == "rows" and dest_key == "outputs_quality":
            data[dest_key] = od.get("rows") or od.get(dest_key) or []
        elif inner == "rows":
            data[dest_key] = od.get("rows") or od.get(dest_key) or od
        elif inner == "phases":
            data[dest_key] = od.get("phases") or od.get(dest_key) or od
    return data


def _default_framework_bundle_payload() -> dict:
    return {
        "logical_impact": catalog.default_logical_impact_rows(),
        "outputs_quality": [],
        "main_phases": catalog.default_main_phases(),
    }


def migrate_framework_bundle_section(dossier: ProjectDossier) -> None:
    ensure_document_sections(dossier)
    bundle = dossier.sections.filter(kind="document", key="framework_bundle").first()
    if not bundle:
        return
    merged = _framework_bundle_data_from_legacy(dossier, bundle.data or {})
    if not merged.get("logical_impact"):
        merged["logical_impact"] = catalog.default_logical_impact_rows()
    if merged.get("outputs_quality") is None:
        merged["outputs_quality"] = []
    if not merged.get("main_phases"):
        merged["main_phases"] = catalog.default_main_phases()
    try:
        cleaned = catalog.validate_section_data("document", "framework_bundle", merged)
    except Exception:
        cleaned = merged
    bundle.data = cleaned
    if bundle.status == "empty" and catalog.section_is_filled(cleaned):
        bundle.status = "filled"
    bundle.save(update_fields=["data", "status", "updated_at"])


def _legacy_closure_approvals_to_rows(dossier: ProjectDossier, old_data: dict) -> list[dict]:
    rows: list[dict] = []
    if not isinstance(old_data, dict):
        return rows
    if old_data.get("sponsor_decision") or old_data.get("sponsor_date") or old_data.get("notes"):
        rows.append(
            {
                "row_id": secrets.token_hex(8),
                "role_title": "مدير الإدارة",
                "name": dossier.sponsor_name or "",
                "email": dossier.sponsor_email or "",
                "status": "approved" if old_data.get("sponsor_decision") else "pending",
                "decided_at": str(old_data.get("sponsor_date") or ""),
                "rejection_reason": "",
            }
        )
    return rows


def migrate_approvals_record_section(dossier: ProjectDossier) -> None:
    ensure_approvals_sections(dossier)
    sec = dossier.sections.filter(kind="approvals", key="approvals_record").first()
    if not sec:
        return
    data = dict(sec.data or {})
    rows = data.get("rows") if isinstance(data.get("rows"), list) else []
    if not rows:
        old = dossier.sections.filter(kind="closure", key="approvals_record").first()
        if old and old.data:
            rows = _legacy_closure_approvals_to_rows(dossier, old.data)
    if not rows and (dossier.sponsor_email or dossier.sponsor_name):
        rows = [
            {
                "row_id": secrets.token_hex(8),
                "role_title": "مدير الإدارة",
                "name": dossier.sponsor_name or "",
                "email": dossier.sponsor_email or "",
                "status": "pending",
                "decided_at": "",
                "rejection_reason": "",
            }
        ]
    for row in rows:
        if isinstance(row, dict) and not row.get("row_id"):
            row["row_id"] = secrets.token_hex(8)
    if rows:
        data["rows"] = rows
        try:
            data = catalog.validate_section_data("approvals", "approvals_record", data)
        except Exception:
            pass
        sec.data = data
        if sec.status == "empty" and catalog.section_is_filled(data):
            sec.status = "filled"
        sec.save(update_fields=["data", "status", "updated_at"])


def migrate_dossier_catalog(dossier: ProjectDossier) -> None:
    """ترحيل تراكمي عند القراءة: إطار المشروع + تبويب الاعتمادات. O(S)."""
    ensure_workspaces_catalog(dossier)
    migrate_framework_bundle_section(dossier)
    migrate_approvals_record_section(dossier)


def document_main_phase_rows(dossier: ProjectDossier) -> list:
    migrate_framework_bundle_section(dossier)
    bundle = dossier.sections.filter(kind="document", key="framework_bundle").first()
    if bundle and bundle.data:
        phases = bundle.data.get("main_phases")
        if isinstance(phases, list):
            return phases
        if isinstance(phases, dict):
            return phases.get("phases") or []
    legacy = dossier.sections.filter(kind="document", key="main_phases").first()
    if legacy and legacy.data:
        return (legacy.data or {}).get("phases") or []
    return []


def approvals_record_rows(dossier: ProjectDossier) -> list[dict]:
    migrate_approvals_record_section(dossier)
    sec = dossier.sections.filter(kind="approvals", key="approvals_record").first()
    data = (sec.data if sec else {}) or {}
    rows = data.get("rows") or []
    return [r for r in rows if isinstance(r, dict)]


def _approver_rows_with_email(dossier: ProjectDossier) -> list[dict]:
    return [r for r in approvals_record_rows(dossier) if (r.get("email") or "").strip()]


def _reset_approver_rows_pending(dossier: ProjectDossier) -> None:
    sec = dossier.sections.filter(kind="approvals", key="approvals_record").first()
    if not sec:
        return
    data = dict(sec.data or {})
    next_rows = []
    for row in data.get("rows") or []:
        if not isinstance(row, dict):
            continue
        r = dict(row)
        if (r.get("email") or "").strip():
            r["status"] = "pending"
            r["decided_at"] = ""
            r["rejection_reason"] = ""
        next_rows.append(r)
    data["rows"] = next_rows
    sec.data = data
    sec.save(update_fields=["data", "updated_at"])


def _update_approver_row(
    dossier: ProjectDossier,
    *,
    row_id: str,
    status: str,
    note: str = "",
    decided_at=None,
) -> None:
    sec = dossier.sections.filter(kind="approvals", key="approvals_record").first()
    if not sec:
        return
    data = dict(sec.data or {})
    rows = []
    for row in data.get("rows") or []:
        if not isinstance(row, dict):
            continue
        r = dict(row)
        if row_id and str(r.get("row_id")) == str(row_id):
            r["status"] = status
            r["decided_at"] = str(decided_at or timezone.now().date())
            if status == "rejected":
                r["rejection_reason"] = note or ""
        rows.append(r)
    data["rows"] = rows
    sec.data = data
    sec.save(update_fields=["data", "updated_at"])


def _all_approvers_approved(dossier: ProjectDossier) -> bool:
    rows = _approver_rows_with_email(dossier)
    if not rows:
        return False
    return all((r.get("status") or "") == "approved" for r in rows)


def _card_section_rows(dossier: ProjectDossier, key: str) -> list:
    sec = dossier.sections.filter(kind="card", key=key).first()
    data = (sec.data if sec else {}) or {}
    rows = data.get("rows") or []
    return rows if isinstance(rows, list) else []


def _lock_rows(rows: list) -> list:
    out = []
    for row in rows:
        if not isinstance(row, dict):
            continue
        locked = dict(row)
        locked["_locked"] = True
        locked["_source"] = "card"
        out.append(locked)
    return out


def _merge_table_from_card(existing_rows: list, card_rows: list) -> list:
    """صفوف البطاقة المقفلة أولاً ثم إضافات الوثيقة غير المقفلة. O(R)."""
    locked = _lock_rows(card_rows)
    extras = []
    for row in existing_rows or []:
        if not isinstance(row, dict):
            continue
        if row.get("_source") == "card" or row.get("_locked"):
            continue
        extras.append(row)
    return locked + extras


@transaction.atomic
def sync_document_from_card(dossier: ProjectDossier) -> None:
    """نسخ بيانات البطاقة إلى الوثيقة تراكمياً دون مسح إضافات الوثيقة. O(S·R)."""
    ensure_document_sections(dossier)
    by_key = {s.key: s for s in dossier.sections.filter(kind="document")}

    # 1) البيانات — تُنسخ دائماً حتى لو اعتُمدت البطاقة (مصدرها البطاقة)، ما لم تُعتمد الوثيقة
    basics = by_key.get("basics")
    if basics and basics.status != "approved":
        basics.data = {
            "marketing_name": dossier.marketing_name or dossier.project.name,
            "department": dossier.department or "",
            "section": dossier.section or "",
            "location": dossier.location or "",
            "execution_start": str(dossier.execution_start or ""),
            "execution_end": str(dossier.execution_end or ""),
            "sponsor_name": dossier.sponsor_name or "",
            "sponsor_email": dossier.sponsor_email or "",
            "manager_name": (
                (dossier.manager.get_full_name() or dossier.manager.username) if dossier.manager_id else ""
            ),
            "manager_email": dossier.manager_email or (dossier.manager.email if dossier.manager_id else ""),
            "strategic_goal": dossier.strategic_goal or "",
        }
        basics.status = "filled" if catalog.section_is_filled(basics.data) else basics.status
        basics.save(update_fields=["data", "status", "updated_at"])

    # 2) المؤشرات
    indicators = by_key.get("indicators")
    if indicators and indicators.status != "approved":
        prev = (indicators.data or {}).get("rows") or []
        merged = _merge_table_from_card(prev, _card_section_rows(dossier, "indicators"))
        indicators.data = {"rows": merged}
        indicators.status = "filled" if merged else indicators.status
        indicators.save(update_fields=["data", "status", "updated_at"])

    # 3) التجارب + فئة مستهدفة
    similar = by_key.get("similar_experiences")
    if similar and similar.status != "approved":
        prev_data = similar.data or {}
        prev_rows = prev_data.get("rows") or []
        merged = _merge_table_from_card(prev_rows, _card_section_rows(dossier, "similar_experiences"))
        similar.data = {
            "rows": merged,
            "target_group": prev_data.get("target_group") or "",
            "beneficiaries_count": prev_data.get("beneficiaries_count") or 0,
        }
        similar.status = "filled" if catalog.section_is_filled(similar.data) else similar.status
        similar.save(update_fields=["data", "status", "updated_at"])

    migrate_framework_bundle_section(dossier)

    # 6) المخصص من البطاقة (عرض فقط) داخل قسم الميزانية
    budget = by_key.get("budget")
    if budget and budget.status != "approved":
        prev = budget.data or {}
        card_alloc = _lock_rows(_card_section_rows(dossier, "project_budget"))
        lines = prev.get("lines") or []
        if not isinstance(lines, list):
            lines = []
        grand = 0.0
        for row in lines:
            if isinstance(row, dict):
                try:
                    grand += float(row.get("line_total") or 0)
                except (TypeError, ValueError):
                    pass
        budget.data = {
            "card_allocation": card_alloc,
            "lines": lines,
            "lines_grand_total": grand,
        }
        budget.status = "filled" if catalog.section_is_filled(budget.data) else budget.status
        budget.save(update_fields=["data", "status", "updated_at"])


def _email_matches(user, email: str) -> bool:
    user_email = (getattr(user, "email", "") or "").strip().lower()
    target = (email or "").strip().lower()
    return bool(user_email and target and user_email == target)


def can_edit_locked_card_rows(user, dossier: ProjectDossier) -> bool:
    """تعديل الصفوف المنقولة من البطاقة: مشرف أو مدير الملف أو الراعي أو صاحب الاعتماد."""
    if not user or not user.is_authenticated:
        return False
    if is_super_admin(user):
        return True
    if dossier.manager_id == user.id:
        return True
    if dossier.sponsor_id == user.id or dossier.approver_id == user.id:
        return True
    return _email_matches(user, dossier.sponsor_email) or _email_matches(user, dossier.approver_email)


def _enforce_locked_rows(old_data: dict, new_data: dict, *, can_edit_locked: bool, table_keys: list[str]) -> dict:
    """يمنع تعديل/حذف الصفوف المقفلة لغير المخوّل. O(R)."""
    if can_edit_locked:
        return new_data
    out = dict(new_data)
    for tkey in table_keys:
        old_rows = old_data.get(tkey) if isinstance(old_data.get(tkey), list) else []
        new_rows = out.get(tkey) if isinstance(out.get(tkey), list) else []
        locked_old = [r for r in old_rows if isinstance(r, dict) and (r.get("_locked") or r.get("_source") == "card")]
        unlocked_new = [r for r in new_rows if isinstance(r, dict) and not (r.get("_locked") or r.get("_source") == "card")]
        # الصفوف المقفلة تُعاد كما كانت
        out[tkey] = locked_old + unlocked_new
    return out


def can_edit_dossier(user, dossier: ProjectDossier) -> bool:
    """مشرف، مدير المشروع، الراعي، أو صاحب الاعتماد. O(1)."""
    if not user or not user.is_authenticated:
        return False
    if is_super_admin(user):
        return True
    if dossier.manager_id == user.id:
        return True
    if dossier.sponsor_id == user.id or dossier.approver_id == user.id:
        return True
    return _email_matches(user, dossier.sponsor_email) or _email_matches(user, dossier.approver_email)


def assert_can_edit(user, dossier: ProjectDossier):
    if not can_edit_dossier(user, dossier):
        raise PermissionDenied("لا صلاحية لتعديل هذا الملف")


def assert_can_create(user):
    if not is_super_admin(user):
        raise PermissionDenied("إنشاء ملف المشروع للمشرف فقط")


def active_stage(dossier: ProjectDossier) -> DossierStage | None:
    return dossier.stages.filter(status__in=["active", "returned", "submitted"]).order_by("order").first()


def can_bypass_workspace_gates(user, dossier: ProjectDossier) -> bool:
    """تجاوز قفل التبويبات لمدير النظام فقط. O(1)."""
    if not user or not user.is_authenticated:
        return False
    return is_super_admin(user)


def can_approve_dossier(user, dossier: ProjectDossier) -> bool:
    """اعتماد التبويبات: مشرف، مدير الإدارة، أو صاحب الاعتماد (توافق). O(1)."""
    if not user or not user.is_authenticated:
        return False
    if is_super_admin(user):
        return True
    if dossier.sponsor_id and dossier.sponsor_id == user.id:
        return True
    if _email_matches(user, dossier.sponsor_email):
        return True
    if dossier.approver_id and dossier.approver_id == user.id:
        return True
    return _email_matches(user, dossier.approver_email)


def workspace_def(key: str) -> dict | None:
    return next((w for w in catalog.WORKSPACES if w["key"] == key), None)


def get_workspace(dossier: ProjectDossier, key: str) -> DossierWorkspace:
    ws = dossier.workspaces.filter(key=key).first()
    if not ws:
        raise ValidationError({"workspace": "تبويب غير موجود"})
    return ws


def assert_workspace_open_for_work(user, dossier: ProjectDossier, key: str) -> DossierWorkspace:
    """قفل تسلسل التبويبات؛ مفتوح لمدير النظام فقط كتجاوز. O(1)."""
    ws = get_workspace(dossier, key)
    if key == "card" or can_bypass_workspace_gates(user, dossier):
        return ws
    if ws.status not in ("active", "returned"):
        raise ValidationError(
            {"workspace": "هذا التبويب مقفل حتى اعتماد التبويب السابق من صاحب الاعتماد"}
        )
    return ws


def workspaces_payload(dossier: ProjectDossier, user=None) -> list[dict]:
    """حالات التبويبات كما في قاعدة البيانات. O(W)."""
    out = []
    for ws in dossier.workspaces.all():
        out.append(
            {
                "id": ws.id,
                "order": ws.order,
                "key": ws.key,
                "status": ws.status,
                "return_note": ws.return_note,
                "approved_at": ws.approved_at,
                "needs_approval": bool(workspace_def(ws.key) and workspace_def(ws.key).get("needs_approval")),
                "label": (workspace_def(ws.key) or {}).get("label") or ws.key,
            }
        )
    return out


def assert_stage_open_for_work(stage: DossierStage | None, *, allow_submitted: bool = False) -> DossierStage:
    """مراحل المحتوى لم تعد بوابات — تُقبل إن وُجدت. O(1)."""
    if not stage:
        raise ValidationError({"stage": "مرحلة غير موجودة"})
    return stage


@transaction.atomic
def create_project_with_dossier(
    *,
    name: str,
    sponsor_name: str,
    sponsor_email: str,
    actor: User | None,
    description: str = "",
    manager_id=None,
    sponsor_id=None,
    approver_id=None,
    approver_name: str = "",
    approver_email: str = "",
    request=None,
) -> ProjectDossier:
    """إنشاء مشروع + ملف دفعة واحدة بعد الاسم والراعي. O(S)."""
    from projects.models import Project
    from projects.slug_utils import unique_slug_from_name

    name = (name or "").strip()
    sponsor_email = (sponsor_email or "").strip()
    sponsor_name = (sponsor_name or "").strip()
    if not name:
        raise ValidationError({"name": "اسم المشروع مطلوب"})
    if not sponsor_email and not sponsor_id:
        raise ValidationError({"sponsor_email": "بريد الراعي مطلوب"})
    project = Project.objects.create(
        name=name,
        slug=unique_slug_from_name(Project, name),
        description=description or "",
        status="draft",
        is_active=True,
        created_by=actor,
    )
    card = {
        "marketing_name": name,
        "sponsor_name": sponsor_name,
        "sponsor_email": sponsor_email,
        "sponsor_id": sponsor_id,
        "approver_name": (approver_name or "").strip(),
        "approver_email": (approver_email or "").strip(),
        "approver_id": approver_id,
    }
    if manager_id is not None:
        card["manager_id"] = manager_id
    return create_dossier_for_project(
        project=project,
        actor=actor,
        card=card,
        request=request,
    )


def update_section(
    *,
    dossier: ProjectDossier,
    kind: str,
    key: str,
    data: dict,
    user,
) -> DossierSection:
    assert_can_edit(user, dossier)
    section_def = catalog.get_section_def(kind, key)
    if not section_def:
        raise ValidationError({"key": "قسم غير معروف"})

    # فصل الوثيقة عن الإغلاق عبر تبويبات الاعتماد؛ البطاقة مفتوحة دائماً
    if kind == "document":
        assert_workspace_open_for_work(user, dossier, "document")
    elif kind == "closure":
        assert_workspace_open_for_work(user, dossier, "closure")
    elif kind == "approvals":
        if not can_edit_dossier(user, dossier):
            raise PermissionDenied("لا صلاحية لتعديل سجل الاعتمادات")
    elif kind == "card":
        assert_workspace_open_for_work(user, dossier, "card")
    else:
        raise ValidationError({"kind": "نوع قسم غير معروف"})
    cleaned = catalog.validate_section_data(kind, key, data)
    section = dossier.sections.get(kind=kind, key=key)
    if section.status == "approved" and not can_approve_dossier(user, dossier):
        raise ValidationError({"status": "القسم معتمد ولا يُعدَّل إلا بإعادة التبويب للتعديل"})

    if kind == "document":
        table_keys = [f["key"] for f in section_def["fields"] if f.get("type") == "table"]
        cleaned = _enforce_locked_rows(
            section.data or {},
            cleaned,
            can_edit_locked=can_edit_locked_card_rows(user, dossier),
            table_keys=table_keys,
        )
        # مخصص البطاقة داخل الميزانية يُعاد من البطاقة دائماً
        if key == "budget":
            cleaned["card_allocation"] = _lock_rows(_card_section_rows(dossier, "project_budget"))
            grand = 0.0
            for row in cleaned.get("lines") or []:
                if isinstance(row, dict):
                    try:
                        grand += float(row.get("line_total") or 0)
                    except (TypeError, ValueError):
                        pass
            cleaned["lines_grand_total"] = grand
        if key == "basics" and not can_edit_locked_card_rows(user, dossier):
            # البيانات المنقولة من البطاقة ثابتة لغير المدير
            cleaned = {
                "marketing_name": dossier.marketing_name or dossier.project.name,
                "department": dossier.department or "",
                "section": dossier.section or "",
                "location": dossier.location or "",
                "execution_start": str(dossier.execution_start or ""),
                "execution_end": str(dossier.execution_end or ""),
                "sponsor_name": dossier.sponsor_name or "",
                "sponsor_email": dossier.sponsor_email or "",
                "manager_name": (
                    (dossier.manager.get_full_name() or dossier.manager.username) if dossier.manager_id else ""
                ),
                "manager_email": dossier.manager_email or (dossier.manager.email if dossier.manager_id else ""),
                "strategic_goal": dossier.strategic_goal or "",
            }

    if kind == "approvals" and key == "approvals_record":
        for row in cleaned.get("rows") or []:
            if isinstance(row, dict) and not row.get("row_id"):
                row["row_id"] = secrets.token_hex(8)

    section.data = cleaned
    section.status = "filled" if catalog.section_is_filled(cleaned) else "empty"
    section.updated_by = user
    section.save(update_fields=["data", "status", "updated_by", "updated_at"])
    if kind == "document" and key == "budget":
        sync_budget_lines_from_section(dossier, cleaned, user=user)
    if kind == "card" and key == "project_budget":
        _sync_dossier_budget_from_card(dossier, cleaned)
    if kind == "card":
        sync_document_from_card(dossier)
    if kind == "document" and key == "framework_bundle":
        sync_plan_from_document(dossier)
    if kind == "document" and key == "team":
        sync_team_memberships(dossier)
    return section


def _sync_dossier_budget_from_card(dossier: ProjectDossier, data: dict) -> None:
    """تحديث مخصصات الملف من صفوف جدول المخصص لكامل المشروع. O(R)."""
    rows = data.get("rows") or []
    assoc = Decimal("0")
    don = Decimal("0")
    for row in rows:
        if not isinstance(row, dict):
            continue
        try:
            assoc += Decimal(str(row.get("from_association") or 0))
            don += Decimal(str(row.get("from_donation") or 0))
        except Exception:
            continue
    dossier.budget_association = assoc
    dossier.budget_donation = don
    dossier.recompute_budget_total()
    dossier.save(update_fields=["budget_association", "budget_donation", "budget_total", "updated_at"])


def info_page_payload(dossier: ProjectDossier) -> dict:
    """صفحة المعلومات — قراءة فقط من أقسام البطاقة. O(R)."""
    by_key = {s.key: s for s in dossier.sections.filter(kind="card")}

    def rows_of(key: str) -> list:
        sec = by_key.get(key)
        data = (sec.data if sec else {}) or {}
        rows = data.get("rows") or []
        return rows if isinstance(rows, list) else []

    indicators = rows_of("indicators")
    phases = rows_of("phases")
    project_budget = rows_of("project_budget")
    phase_assoc = 0.0
    phase_don = 0.0
    for row in phases:
        if not isinstance(row, dict):
            continue
        try:
            phase_assoc += float(row.get("budget_association") or 0)
            phase_don += float(row.get("budget_donation") or 0)
        except (TypeError, ValueError):
            continue
    return {
        "code": dossier.code,
        "name": dossier.marketing_name or dossier.project.name,
        "department": dossier.department,
        "section": dossier.section,
        "strategic_goal": dossier.strategic_goal,
        "execution_start": dossier.execution_start,
        "execution_end": dossier.execution_end,
        "location": dossier.location,
        "sponsor_name": dossier.sponsor_name,
        "sponsor_email": dossier.sponsor_email,
        "manager_name": (
            (dossier.manager.get_full_name() or dossier.manager.username) if dossier.manager_id else ""
        ),
        "manager_email": dossier.manager_email or (dossier.manager.email if dossier.manager_id else ""),
        "indicators": indicators,
        "phases_budget_summary": {
            "from_association": phase_assoc,
            "from_donation": phase_don,
            "total": phase_assoc + phase_don,
            "rows": phases,
        },
        "project_budget": project_budget,
        "outputs": rows_of("outputs"),
        "similar_experiences": rows_of("similar_experiences"),
    }


def _money_key(amount) -> str:
    """مفتاح مقارنة موحّد للمبالغ (يتجنب 400 مقابل 400.00)."""
    try:
        return format(Decimal(str(amount or 0)).quantize(Decimal("0.01")), "f")
    except Exception:
        return "0.00"


def sync_budget_lines_from_section(dossier: ProjectDossier, data: dict, user=None) -> list[BudgetLine]:
    """مزامنة بنود مقترحة من قسم التكلفة — إضافة تراكمية للبنود الجديدة. O(L)."""
    rows = data.get("lines") or []
    if not isinstance(rows, list):
        return list(dossier.budget_lines.all())
    existing = {(bl.title, _money_key(bl.proposed_amount)): bl for bl in dossier.budget_lines.all()}
    created = []

    # المخصص المعروض من البطاقة لا يستبدل مخصصات الملف إلا عند وجود صفوف بطاقة
    card_alloc = data.get("card_allocation") or []
    if isinstance(card_alloc, list) and card_alloc:
        assoc = Decimal("0")
        don = Decimal("0")
        for row in card_alloc:
            if not isinstance(row, dict):
                continue
            try:
                assoc += Decimal(str(row.get("from_association") or 0))
                don += Decimal(str(row.get("from_donation") or 0))
            except Exception:
                continue
        dossier.budget_association = assoc
        dossier.budget_donation = don
        dossier.recompute_budget_total()
        dossier.save(update_fields=["budget_association", "budget_donation", "budget_total", "updated_at"])

    for i, row in enumerate(rows):
        if not isinstance(row, dict):
            continue
        title = str(row.get("statement") or row.get("item") or row.get("title") or "").strip()
        if not title:
            activity = str(row.get("activity") or "").strip()
            title = activity or f"بند {i + 1}"
        try:
            amount = Decimal(str(row.get("line_total") or row.get("amount") or 0))
        except Exception:
            amount = Decimal("0")
        key = (title, _money_key(amount))
        if key in existing:
            continue
        phase_label = ""
        phase_key = str(row.get("phase_key") or "")
        for p in catalog.DOCUMENT_FIXED_PHASES:
            if p["key"] == phase_key:
                phase_label = p["label"]
                break
        notes_parts = [
            phase_label and f"المرحلة: {phase_label}",
            row.get("activity") and f"النشاط: {row.get('activity')}",
            row.get("quantity") is not None and f"الكمية: {row.get('quantity')}",
            row.get("unit_price") is not None and f"سعر الوحدة: {row.get('unit_price')}",
        ]
        bl = BudgetLine.objects.create(
            dossier=dossier,
            title=title,
            source=phase_key or str(row.get("source") or ""),
            notes=" | ".join(str(p) for p in notes_parts if p),
            proposed_amount=amount,
            allocated_amount=Decimal("0"),
            spent_amount=Decimal("0"),
            sort_order=i,
        )
        BudgetTxn.objects.create(
            line=bl,
            kind="adjust",
            amount=amount,
            note="إنشاء من تكلفة الوثيقة",
            created_by=user,
        )
        created.append(bl)
        existing[key] = bl
    return list(dossier.budget_lines.all())


@transaction.atomic
def allocate_budget_line(*, dossier: ProjectDossier, line_id: int, amount, user, note: str = "") -> BudgetLine:
    """مخصص الراعي/المشرف على بند. O(1)."""
    email = (getattr(user, "email", "") or "").strip().lower()
    is_sponsor = bool(
        (dossier.sponsor_id and dossier.sponsor_id == user.id)
        or (email and email == (dossier.sponsor_email or "").strip().lower())
    )
    is_approver = can_approve_dossier(user, dossier)
    if not (is_super_admin(user) or is_sponsor or is_approver):
        raise PermissionDenied("ضبط المخصص للراعي أو صاحب الاعتماد أو المشرف فقط")
    line = get_budget_line(dossier, line_id)
    amt = Decimal(str(amount))
    if amt < 0:
        raise ValidationError({"amount": "المخصص لا يكون سالباً"})
    line.allocated_amount = amt
    line.save(update_fields=["allocated_amount", "updated_at"])
    BudgetTxn.objects.create(
        line=line,
        kind="allocate",
        amount=amt,
        note=note or "تحديث المخصص",
        created_by=user,
    )
    return line


def get_budget_line(dossier: ProjectDossier, line_id: int) -> BudgetLine:
    line = dossier.budget_lines.filter(pk=line_id).first()
    if not line:
        raise ValidationError({"line": "بند غير موجود"})
    return line


@transaction.atomic
def spend_budget_line(
    *,
    dossier: ProjectDossier,
    line_id: int,
    amount,
    user,
    activity: StageActivity | None = None,
    note: str = "",
) -> BudgetLine:
    """خصم تراكمي من البند أثناء الخطة. O(1)."""
    assert_can_edit(user, dossier)
    line = get_budget_line(dossier, line_id)
    amt = Decimal(str(amount))
    if amt <= 0:
        raise ValidationError({"amount": "مبلغ الصرف يجب أن يكون موجباً"})
    ceiling = line.allocated_amount if line.allocated_amount else line.proposed_amount
    if (line.spent_amount or 0) + amt > (ceiling or 0):
        raise ValidationError({"amount": "التجاوز عن المخصص/المقترح غير مسموح"})
    line.spent_amount = (line.spent_amount or 0) + amt
    line.save(update_fields=["spent_amount", "updated_at"])
    BudgetTxn.objects.create(
        line=line,
        kind="spend",
        amount=amt,
        note=note or "صرف من الخطة التنفيذية",
        activity=activity,
        created_by=user,
    )
    return line


@transaction.atomic
def complete_activity(
    *,
    dossier: ProjectDossier,
    activity: StageActivity,
    user,
    lessons: str = "",
    notes: str = "",
    evidence_url: str = "",
    evidence_file=None,
    evidence_title: str = "",
) -> StageActivity:
    """إتمام نشاط مع شاهد إلزامي ودرس مستفاد. O(1)."""
    assert_can_complete_parent_activity(activity)
    assert_can_work_assigned_activity(user, dossier, activity)
    is_assignee_only = (
        not is_super_admin(user)
        and not can_edit_dossier(user, dossier)
        and activity.responsible_user_id == getattr(user, "id", None)
    )
    if not is_assignee_only:
        assert_workspace_open_for_work(user, dossier, "plan")
    has_file = bool(evidence_file)
    has_url = bool((evidence_url or "").strip())
    if not has_file and not has_url:
        # اقبل شاهداً سابقاً مرتبطاً
        if not activity.attachments.exists():
            raise ValidationError({"evidence": "الشاهد مطلوب عند إتمام النشاط (ملف أو رابط)"})
    if not (lessons or "").strip() and not (activity.lessons or "").strip():
        raise ValidationError({"lessons": "الدرس المستفاد مطلوب عند الإتمام"})
    if lessons:
        activity.lessons = lessons
    if notes:
        activity.notes = notes
    activity.manual_status = "done"
    activity.progress_pct = 100
    refresh_activity_auto_status(activity, save=False)
    activity.save()
    _append_closure_lesson(dossier, activity, activity.lessons)
    if has_file or has_url:
        DossierAttachment.objects.create(
            dossier=dossier,
            stage=activity.stage,
            activity=activity,
            title=evidence_title or f"شاهد {activity.code}",
            file=evidence_file if has_file else "",
            external_url=evidence_url.strip() if has_url else "",
            uploaded_by=user,
        )
    return activity


def _append_closure_lesson(dossier: ProjectDossier, activity: StageActivity, lesson: str) -> None:
    """يُلحق الدرس بصفوف الإغلاق دون استبدال السابق. O(R)."""
    text = (lesson or "").strip()
    if not text:
        return
    section = dossier.sections.filter(kind="closure", key="lessons_learned").first()
    if not section:
        return
    data = dict(section.data or {})
    rows = [row for row in (data.get("lessons") or []) if isinstance(row, dict)]
    rows.append(
        {
            "activity_code": activity.code or "",
            "lesson": text,
            "recommendation": "",
        }
    )
    data["lessons"] = rows
    section.data = data
    section.status = "filled"
    section.save(update_fields=["data", "status", "updated_at"])


def document_closure_comparison(dossier: ProjectDossier) -> dict:
    """مقارنة أقسام الوثيقة مع الإغلاق. O(S·F)."""
    pairs = [
        ("basics", "closure_basics", "البيانات الأساسية"),
        ("team", "closure_team", "فريق العمل"),
        ("volunteers", "volunteer_contributions", "المتطوعون"),
        ("risks", "risk_log", "المخاطر"),
        ("budget", "financial_performance", "الأداء المالي / التكلفة"),
        ("budget", "final_cost", "التكلفة النهائية"),
        ("objectives", "scope_measure", "النطاق / الأهداف"),
        ("framework_bundle", "time_performance", "الأداء الزمني"),
        ("stakeholders", "stakeholder_satisfaction", "أصحاب المصلحة"),
    ]
    doc_map = {s.key: s for s in dossier.sections.filter(kind="document")}
    clo_map = {s.key: s for s in dossier.sections.filter(kind="closure")}
    rows = []
    for dkey, ckey, label in pairs:
        dsec = doc_map.get(dkey)
        csec = clo_map.get(ckey)
        rows.append(
            {
                "label": label,
                "document_key": dkey,
                "closure_key": ckey,
                "document_status": dsec.status if dsec else "empty",
                "closure_status": csec.status if csec else "empty",
                "document_data": dsec.data if dsec else {},
                "closure_data": csec.data if csec else {},
            }
        )
    lines = [
        {
            "id": bl.id,
            "title": bl.title,
            "proposed": str(bl.proposed_amount),
            "allocated": str(bl.allocated_amount),
            "spent": str(bl.spent_amount),
            "remaining": str(bl.remaining),
        }
        for bl in dossier.budget_lines.all()
    ]
    return {"pairs": rows, "budget_lines": lines}


@transaction.atomic
def decide_document_section(
    *,
    dossier: ProjectDossier,
    key: str,
    decision: str,
    user,
    note: str = "",
    request=None,
) -> DossierSection:
    """اعتماد/إعادة بطاقة وثيقة من صاحب الاعتماد أو المشرف. O(S)."""
    if decision not in ("approved", "returned", "revoke"):
        raise ValidationError({"decision": "قرار غير صالح"})
    if not can_approve_dossier(user, dossier):
        raise PermissionDenied("اعتماد بطاقات الوثيقة لصاحب الاعتماد أو المشرف فقط")
    assert_workspace_open_for_work(user, dossier, "document")
    if not catalog.get_section_def("document", key):
        raise ValidationError({"key": "قسم غير معروف"})
    section = dossier.sections.select_for_update().filter(kind="document", key=key).first()
    if not section:
        raise ValidationError({"key": "القسم غير موجود — أعد مزامنة الوثيقة"})
    if decision == "approved":
        if section.status not in ("filled", "submitted", "returned", "approved"):
            raise ValidationError({"status": "لا يمكن اعتماد بطاقة فارغة"})
        section.status = "approved"
    elif decision == "revoke":
        if section.status != "approved":
            raise ValidationError({"status": "البطاقة ليست معتمدة"})
        section.status = "filled" if catalog.section_is_filled(section.data or {}) else "empty"
    else:
        section.status = "returned"
    section.updated_by = user
    section.save(update_fields=["status", "updated_by", "updated_at"])

    doc_ws = dossier.workspaces.filter(key="document").first()
    if decision == "approved":
        keys = catalog.all_section_keys("document")
        pending = (
            dossier.sections.filter(kind="document", key__in=keys)
            .exclude(status="approved")
            .count()
        )
        if pending == 0 and doc_ws and doc_ws.status in ("active", "returned", "submitted"):
            _approve_workspace(dossier, "document", actor=user, request=request)
    elif decision == "revoke" and doc_ws and doc_ws.status == "approved":
        doc_ws.status = "active"
        doc_ws.approved_at = None
        doc_ws.save(update_fields=["status", "approved_at", "updated_at"])
        _lock_following_unapproved(dossier, doc_ws.order)

    log_activity(
        actor=user,
        action=ACTION_STAGE_APPROVE if decision == "approved" else ACTION_STAGE_RETURN,
        summary=f"{'اعتماد' if decision == 'approved' else 'إعادة'} بطاقة وثيقة {key} — {dossier.code}"
        + (f" ({note})" if note else ""),
        request=request,
        target=dossier,
    )
    return section


@transaction.atomic
def decide_plan_phase(
    *,
    dossier: ProjectDossier,
    key: str,
    decision: str,
    user,
    note: str = "",
    request=None,
) -> DossierSection:
    """اعتماد مرحلة في الخطة أو إزالة اعتمادها. O(P)."""
    if decision not in ("approved", "revoke"):
        raise ValidationError({"decision": "قرار غير صالح"})
    if not can_approve_dossier(user, dossier):
        raise PermissionDenied("اعتماد مراحل الخطة لصاحب الاعتماد أو المشرف فقط")
    if key not in catalog.plan_phase_keys():
        raise ValidationError({"key": "مرحلة غير معروفة"})
    assert_workspace_open_for_work(user, dossier, "plan")
    ensure_plan_phase_sections(dossier)
    section = dossier.sections.select_for_update().filter(kind="plan", key=key).first()
    if not section:
        raise ValidationError({"key": "مرحلة الخطة غير موجودة"})
    if decision == "approved":
        section.status = "approved"
    else:
        if section.status != "approved":
            raise ValidationError({"status": "المرحلة ليست معتمدة"})
        has = StageActivity.objects.filter(stage__dossier=dossier, stage__key=key).exists()
        section.status = "filled" if has else "empty"
    section.updated_by = user
    section.save(update_fields=["status", "updated_by", "updated_at"])

    plan_ws = dossier.workspaces.filter(key="plan").first()
    keys = catalog.plan_phase_keys()
    if decision == "approved":
        pending = (
            dossier.sections.filter(kind="plan", key__in=keys).exclude(status="approved").count()
        )
        if pending == 0 and plan_ws and plan_ws.status in ("active", "returned", "submitted"):
            _approve_workspace(dossier, "plan", actor=user, request=request)
    elif decision == "revoke" and plan_ws and plan_ws.status == "approved":
        plan_ws.status = "active"
        plan_ws.approved_at = None
        plan_ws.save(update_fields=["status", "approved_at", "updated_at"])
        _lock_following_unapproved(dossier, plan_ws.order)

    log_activity(
        actor=user,
        action=ACTION_STAGE_APPROVE if decision == "approved" else ACTION_STAGE_RETURN,
        summary=f"{'اعتماد' if decision == 'approved' else 'إزالة اعتماد'} مرحلة الخطة {key} — {dossier.code}"
        + (f" ({note})" if note else ""),
        request=request,
        target=dossier,
    )
    return section


@transaction.atomic
def submit_workspace(*, dossier: ProjectDossier, key: str, user, request=None) -> tuple[ApprovalRequest, bool]:
    """إرسال تبويب (وثيقة/خطة/إغلاق/لوحة) لاعتماد صاحب الاعتماد. O(1). يُرجع (approval, email_sent)."""
    assert_can_edit(user, dossier)
    migrate_dossier_catalog(dossier)
    wdef = workspace_def(key)
    if not wdef or not wdef.get("needs_approval"):
        raise ValidationError({"workspace": "هذا التبويب لا يحتاج اعتماداً"})
    ws = dossier.workspaces.select_for_update().filter(key=key).first()
    if not ws:
        raise ValidationError({"workspace": "تبويب غير موجود"})
    if ws.status not in ("active", "returned"):
        raise ValidationError({"status": "لا يمكن إرسال هذا التبويب الآن"})
    approver_rows = _approver_rows_with_email(dossier)
    if not approver_rows:
        raise ValidationError(
            {"approvals": "أضف معتمداً واحداً على الأقل ببريد صالح في تبويب الاعتمادات"}
        )

    if key == "document":
        keys = catalog.all_section_keys("document")
        secs = list(dossier.sections.filter(kind="document", key__in=keys))
        if len(secs) < len(keys):
            sync_document_from_card(dossier)
            secs = list(dossier.sections.filter(kind="document", key__in=keys))
        not_ready = [s.key for s in secs if s.status not in ("filled", "submitted", "approved", "returned")]
        if not_ready:
            raise ValidationError({"sections": f"بطاقات غير مكتملة: {', '.join(not_ready)}"})
        # للإيميل: تُرسل البطاقات غير المعتمدة بعد كـ submitted؛ المعتمدة تبقى
        dossier.sections.filter(kind="document", status__in=("filled", "returned")).update(status="submitted")
    elif key == "plan":
        ensure_plan_phase_sections(dossier)
        keys = catalog.plan_phase_keys()
        missing = [
            k
            for k in keys
            if not dossier.sections.filter(kind="plan", key=k, status="approved").exists()
        ]
        if missing:
            raise ValidationError({"sections": "اعتمد المراحل الخمس قبل إرسال الخطة"})
    elif key == "closure":
        dossier.sections.filter(kind="closure", status__in=("filled", "returned", "submitted")).update(status="submitted")
    elif key == "approvals":
        sec = dossier.sections.filter(kind="approvals", key="approvals_record").first()
        if not sec or sec.status not in ("filled", "returned", "submitted", "approved"):
            raise ValidationError({"sections": "أكمل سجل المعتمدين قبل الإرسال"})

    _reset_approver_rows_pending(dossier)

    ws.status = "submitted"
    ws.return_note = ""
    ws.save(update_fields=["status", "return_note", "updated_at"])
    dossier.status = "pending_approval"
    dossier.save(update_fields=["status", "updated_at"])

    ApprovalRequest.objects.filter(
        dossier=dossier, scope=key, decision="pending"
    ).update(decision="expired", decided_at=timezone.now())

    first: ApprovalRequest | None = None
    emailed = False
    for row in approver_rows:
        row_id = str(row.get("row_id") or "")
        approval = ApprovalRequest.create_pending(
            dossier=dossier,
            scope=key,
            payload={
                "workspace_key": key,
                "workspace_label": wdef["label"],
                "dossier_code": dossier.code,
                "project_name": dossier.project.name,
                "approver_row_id": row_id,
                "approver_name": row.get("name") or "",
                "approver_role": row.get("role_title") or "",
            },
            recipient_email=str(row.get("email") or ""),
            recipient_name=str(row.get("name") or ""),
            approver_row_id=row_id,
        )
        if first is None:
            first = approval
        if send_approval_email(approval):
            emailed = True
    log_activity(
        actor=user,
        action=ACTION_STAGE_SUBMIT,
        summary=f"إرسال تبويب {key} للاعتماد — {dossier.code}",
        request=request,
        target=dossier,
    )
    _notify_dossier_event(
        dossier=dossier,
        message=f"طُلب اعتماد «{wdef['label']}» لمشروع {dossier.code}",
        link=f"/Admin/projects/{dossier.project.slug}/dossier",
        users=[u for u in [dossier.manager, dossier.sponsor] if u],
        roles=["admin"],
    )
    return first, emailed


def _lock_following_unapproved(dossier: ProjectDossier, order: int) -> None:
    """يقفل التبويبات اللاحقة غير المعتمدة. O(W)."""
    for nxt in dossier.workspaces.filter(order__gt=order).order_by("order"):
        if nxt.status == "approved":
            continue
        if nxt.status != "locked":
            nxt.status = "locked"
            nxt.return_note = ""
            nxt.save(update_fields=["status", "return_note", "updated_at"])


def _revoke_workspace(dossier: ProjectDossier, key: str, *, actor=None, request=None):
    """إزالة اعتماد تبويب وإقفال ما فُتح بعده ولم يُعتمد. O(W)."""
    ws = dossier.workspaces.select_for_update().filter(key=key).first()
    if not ws:
        raise ValidationError({"workspace": "تبويب غير موجود"})
    if ws.status != "approved":
        raise ValidationError({"status": "التبويب ليس معتمداً"})
    ws.status = "active"
    ws.approved_at = None
    ws.return_note = ""
    ws.save(update_fields=["status", "approved_at", "return_note", "updated_at"])
    _lock_following_unapproved(dossier, ws.order)
    dossier.status = "in_progress"
    dossier.save(update_fields=["status", "updated_at"])
    log_activity(
        actor=actor,
        action=ACTION_STAGE_RETURN,
        summary=f"إزالة اعتماد تبويب {key} — {dossier.code}",
        request=request,
        target=dossier,
    )


def _workspace_label(key: str) -> str:
    return next((w["label"] for w in catalog.WORKSPACES if w["key"] == key), key)


def _approve_workspace(dossier: ProjectDossier, key: str, *, actor=None, request=None):
    ws = dossier.workspaces.select_for_update().filter(key=key).first()
    if not ws:
        raise ValidationError({"workspace": "تبويب غير موجود"})

    if key == "document":
        keys = catalog.all_section_keys("document")
        not_ready = (
            dossier.sections.filter(kind="document", key__in=keys)
            .exclude(status__in=("approved", "submitted", "filled"))
            .count()
        )
        if not_ready:
            raise ValidationError({"sections": "لا يمكن اعتماد الوثيقة قبل اكتمال كل البطاقات"})
        dossier.sections.filter(kind="document", key__in=keys).update(status="approved")
    elif key == "plan":
        ensure_plan_phase_sections(dossier)
        keys = catalog.plan_phase_keys()
        pending = dossier.sections.filter(kind="plan", key__in=keys).exclude(status="approved").count()
        if pending:
            raise ValidationError({"sections": "اعتمد المراحل الخمس قبل اعتماد الخطة"})
    elif key == "closure":
        dossier.sections.filter(kind="closure").update(status="approved")
    elif key == "approvals":
        dossier.sections.filter(kind="approvals").update(status="approved")

    ws.status = "approved"
    ws.approved_at = timezone.now()
    ws.return_note = ""
    ws.save(update_fields=["status", "approved_at", "return_note", "updated_at"])

    nxt = dossier.workspaces.filter(order=ws.order + 1).first()
    if nxt and nxt.status == "locked":
        nxt.status = "active"
        nxt.save(update_fields=["status", "updated_at"])
        dossier.status = "in_progress"
    elif key == "board":
        dossier.status = "closed"
    else:
        dossier.status = "in_progress"
    dossier.save(update_fields=["status", "updated_at"])
    log_activity(
        actor=actor,
        action=ACTION_STAGE_APPROVE,
        summary=f"اعتماد تبويب {key} — {dossier.code}",
        request=request,
        target=dossier,
    )


def _return_workspace(dossier: ProjectDossier, key: str, *, note: str, actor=None, request=None):
    ws = dossier.workspaces.select_for_update().filter(key=key).first()
    if not ws:
        raise ValidationError({"workspace": "تبويب غير موجود"})
    ws.status = "returned"
    ws.return_note = note or ""
    ws.save(update_fields=["status", "return_note", "updated_at"])
    if key == "document":
        dossier.sections.filter(kind="document").update(status="returned")
    elif key == "plan":
        for sec in dossier.sections.filter(kind="plan", status="approved"):
            has = StageActivity.objects.filter(stage__dossier=dossier, stage__key=sec.key).exists()
            sec.status = "filled" if has else "empty"
            sec.save(update_fields=["status", "updated_at"])
    elif key == "closure":
        dossier.sections.filter(kind="closure").update(status="returned")
    elif key == "approvals":
        dossier.sections.filter(kind="approvals").update(status="returned")
    dossier.status = "in_progress"
    dossier.save(update_fields=["status", "updated_at"])
    log_activity(
        actor=actor,
        action=ACTION_STAGE_RETURN,
        summary=f"إعادة تبويب {key} للتعديل — {dossier.code}",
        request=request,
        target=dossier,
    )


@transaction.atomic
def submit_stage(*, dossier: ProjectDossier, order: int, user, request=None) -> tuple[ApprovalRequest, bool]:
    """إرسال مرحلة قديمة للاعتماد. يُرجع (approval, email_sent)."""
    assert_can_edit(user, dossier)
    stage = dossier.stages.select_for_update().filter(order=order).first()
    if not stage:
        raise ValidationError({"order": "مرحلة غير موجودة"})
    if stage.status not in ("active", "returned"):
        raise ValidationError({"status": "لا يمكن إرسال هذه المرحلة الآن"})
    if not dossier.approver_email:
        raise ValidationError({"approver_email": "بريد صاحب الاعتماد مطلوب قبل الإرسال"})

    kind = "closure" if stage.key == "close" else "document"
    for sdef in catalog.sections_for_stage(kind, stage.key):
        sec = dossier.sections.filter(kind=kind, key=sdef["key"]).first()
        if sec:
            sec.status = "submitted" if sec.status in ("filled", "returned", "submitted") else sec.status
            sec.save(update_fields=["status", "updated_at"])

    stage.status = "submitted"
    stage.return_note = ""
    stage.save(update_fields=["status", "return_note", "updated_at"])
    dossier.status = "pending_approval"
    dossier.save(update_fields=["status", "updated_at"])

    ApprovalRequest.objects.filter(
        dossier=dossier, scope="stage", stage=stage, decision="pending"
    ).update(decision="expired", decided_at=timezone.now())

    approval = ApprovalRequest.create_pending(
        dossier=dossier,
        scope="stage",
        stage=stage,
        payload={
            "stage_key": stage.key,
            "stage_order": stage.order,
            "dossier_code": dossier.code,
            "project_name": dossier.project.name,
        },
    )
    emailed = send_approval_email(approval)
    log_activity(
        actor=user,
        action=ACTION_STAGE_SUBMIT,
        summary=f"إرسال مرحلة {stage.key} للاعتماد — {dossier.code}",
        request=request,
        target=stage,
    )
    _notify_dossier_event(
        dossier=dossier,
        message=f"طُلب اعتماد مرحلة «{_stage_label(stage.key)}» لمشروع {dossier.code}",
        link=f"/Admin/projects/{dossier.project.slug}/dossier",
        users=[u for u in [dossier.manager] if u],
        roles=["admin"],
    )
    return approval, emailed


def _stage_label(key: str) -> str:
    return next((s["label"] for s in catalog.STAGES if s["key"] == key), key)


def _notify_dossier_event(*, dossier, message: str, link: str, users=None, roles=None):
    try:
        from notifications.services import EVENT_PROJECT, notify

        notify(
            message=message,
            users=users or [],
            roles=roles or [],
            notification_type="info",
            link=link,
            event_type=EVENT_PROJECT,
        )
    except Exception:
        # لا نكسر مسار الاعتماد إن تعطّل مركز الإشعارات
        pass


@transaction.atomic
def apply_approval_decision(
    *,
    approval: ApprovalRequest,
    decision: str,
    note: str = "",
    actor: User | None = None,
    request=None,
) -> ApprovalRequest:
    if decision not in ("approved", "returned"):
        raise ValidationError({"decision": "قرار غير صالح"})
    locked = ApprovalRequest.objects.select_for_update().filter(pk=approval.pk).first()
    if not locked:
        raise ValidationError({"token": "طلب غير موجود"})
    if locked.decision != "pending":
        raise ValidationError({"token": "تم استخدام هذا الرابط مسبقاً"})
    if timezone.now() > locked.expires_at:
        locked.decision = "expired"
        locked.decided_at = timezone.now()
        locked.save(update_fields=["decision", "decided_at"])
        raise ValidationError({"token": "انتهت صلاحية الرابط"})

    locked.decision = decision
    locked.note = note or ""
    locked.decided_at = timezone.now()
    locked.save(update_fields=["decision", "note", "decided_at"])

    dossier = locked.dossier
    stage = locked.stage

    if locked.scope == "stage" and stage:
        if decision == "approved":
            _approve_stage(dossier, stage, actor=actor, request=request)
        else:
            _return_stage(dossier, stage, note=note, actor=actor, request=request)
    elif locked.scope in ("document", "plan", "closure", "approvals", "board"):
        row_id = locked.approver_row_id or (locked.payload_snapshot or {}).get("approver_row_id") or ""
        via_admin = bool(actor) or (locked.payload_snapshot or {}).get("via") == "admin"
        if row_id:
            if decision == "returned":
                _update_approver_row(dossier, row_id=row_id, status="rejected", note=note)
            else:
                _update_approver_row(dossier, row_id=row_id, status="approved", note=note)
        if decision == "returned":
            _return_workspace(dossier, locked.scope, note=note, actor=actor, request=request)
        elif via_admin or _all_approvers_approved(dossier):
            _approve_workspace(dossier, locked.scope, actor=actor, request=request)
    elif locked.scope == "card":
        if decision == "approved":
            _approve_workspace(dossier, "card", actor=actor, request=request)
        else:
            _return_workspace(dossier, "card", note=note, actor=actor, request=request)

    log_activity(
        actor=actor,
        action=ACTION_APPROVAL_DECIDE,
        summary=f"قرار اعتماد {decision} لـ {dossier.code}",
        request=request,
        target=locked,
    )
    stage_key = stage.key if stage else locked.scope
    if decision == "approved":
        msg = f"اعتُمدت مرحلة «{_stage_label(stage_key)}» لمشروع {dossier.code}"
    else:
        msg = f"أُعيدت مرحلة «{_stage_label(stage_key)}» للتعديل — {dossier.code}"
    recipients = [u for u in [dossier.manager, dossier.sponsor] if u]
    _notify_dossier_event(
        dossier=dossier,
        message=msg,
        link=f"/Admin/projects/{dossier.project.slug}/dossier",
        users=recipients,
        roles=["admin"],
    )
    return locked


def _approve_stage(dossier: ProjectDossier, stage: DossierStage, *, actor=None, request=None):
    stage.status = "approved"
    stage.approved_at = timezone.now()
    stage.return_note = ""
    stage.save(update_fields=["status", "approved_at", "return_note", "updated_at"])

    kind = "closure" if stage.key == "close" else "document"
    dossier.sections.filter(kind=kind, key__in=[s["key"] for s in catalog.sections_for_stage(kind, stage.key)]).update(
        status="approved"
    )

    nxt = dossier.stages.filter(order=stage.order + 1).first()
    if nxt:
        nxt.status = "active"
        nxt.save(update_fields=["status", "updated_at"])
        dossier.current_stage = nxt.key
        dossier.status = "in_progress"
    else:
        dossier.current_stage = stage.key
        dossier.status = "closed" if stage.key == "close" else "approved"
    dossier.save(update_fields=["current_stage", "status", "updated_at"])
    log_activity(
        actor=actor,
        action=ACTION_STAGE_APPROVE,
        summary=f"اعتماد مرحلة {stage.key} — {dossier.code}",
        request=request,
        target=stage,
    )


def _return_stage(dossier: ProjectDossier, stage: DossierStage, *, note: str, actor=None, request=None):
    stage.status = "returned"
    stage.return_note = note or ""
    stage.save(update_fields=["status", "return_note", "updated_at"])
    kind = "closure" if stage.key == "close" else "document"
    dossier.sections.filter(kind=kind, key__in=[s["key"] for s in catalog.sections_for_stage(kind, stage.key)]).update(
        status="returned"
    )
    dossier.status = "in_progress"
    dossier.save(update_fields=["status", "updated_at"])
    log_activity(
        actor=actor,
        action=ACTION_STAGE_RETURN,
        summary=f"إعادة مرحلة {stage.key} للتعديل — {dossier.code}",
        request=request,
        target=stage,
    )


@transaction.atomic
def admin_decide_workspace(*, dossier: ProjectDossier, key: str, decision: str, note: str, user, request=None):
    """اعتماد أو إزالة اعتماد تبويب من المنصة (مشرف أو صاحب الاعتماد)."""
    if not can_approve_dossier(user, dossier):
        raise PermissionDenied("الاعتماد الداخلي لصاحب الاعتماد أو المشرف فقط")
    ws = dossier.workspaces.select_for_update().filter(key=key).first()
    if not ws:
        raise ValidationError({"workspace": "تبويب غير موجود"})
    if decision == "revoke":
        _revoke_workspace(dossier, key, actor=user, request=request)
        return None
    if decision == "approved" and ws.status != "submitted":
        if ws.status not in ("active", "returned"):
            raise ValidationError({"status": "لا يمكن اعتماد هذا التبويب الآن"})
        _approve_workspace(dossier, key, actor=user, request=request)
        return None
    if ws.status != "submitted":
        raise ValidationError({"status": "التبويب ليس بانتظار الاعتماد"})
    approval = (
        ApprovalRequest.objects.select_for_update()
        .filter(dossier=dossier, scope=key, decision="pending")
        .order_by("-created_at")
        .first()
    )
    if not approval:
        approval = ApprovalRequest.create_pending(
            dossier=dossier, scope=key, payload={"via": "admin", "workspace_key": key}
        )
    else:
        payload = dict(approval.payload_snapshot or {})
        payload["via"] = "admin"
        approval.payload_snapshot = payload
        approval.save(update_fields=["payload_snapshot"])
    return apply_approval_decision(
        approval=approval, decision=decision, note=note, actor=user, request=request
    )


@transaction.atomic
def admin_decide_stage(*, dossier: ProjectDossier, order: int, decision: str, note: str, user, request=None):
    """اعتماد/إعادة من داخل المنصة (مشرف) — مسار قديم للمراحل."""
    if not is_super_admin(user):
        raise PermissionDenied("الاعتماد الداخلي للمشرف فقط")
    stage = dossier.stages.select_for_update().filter(order=order).first()
    if not stage:
        raise ValidationError({"order": "مرحلة غير موجودة"})
    if stage.status != "submitted":
        raise ValidationError({"status": "المرحلة ليست بانتظار الاعتماد"})
    approval = ApprovalRequest.create_pending(
        dossier=dossier, scope="stage", stage=stage, payload={"via": "admin"}
    )
    return apply_approval_decision(
        approval=approval, decision=decision, note=note, actor=user, request=request
    )


def dashboard_stats(dossier: ProjectDossier) -> dict:
    """لوحة المشروع. O(A) للأنشطة."""
    activities = StageActivity.objects.filter(stage__dossier=dossier)
    total = activities.count()
    done = activities.filter(auto_status="done").count()
    delayed = activities.filter(auto_status="delayed").count()
    progress = int(round((done / total) * 100)) if total else 0
    today = timezone.localdate()
    days_left = None
    close_stage = dossier.stages.filter(key="close").first()
    if close_stage and close_stage.planned_end:
        days_left = (close_stage.planned_end - today).days
    stage_finance = []
    for st in dossier.stages.all():
        stage_finance.append(
            {
                "order": st.order,
                "key": st.key,
                "status": st.status,
                "planned_start": st.planned_start,
                "planned_end": st.planned_end,
            }
        )
    return {
        "progress_pct": progress,
        "activities_total": total,
        "activities_done": done,
        "activities_delayed": delayed,
        "days_to_close": days_left,
        "budget_total": str(dossier.budget_total),
        "budget_association": str(dossier.budget_association),
        "budget_donation": str(dossier.budget_donation),
        "budget_lines": [
            {
                "id": bl.id,
                "title": bl.title,
                "proposed": str(bl.proposed_amount),
                "allocated": str(bl.allocated_amount),
                "spent": str(bl.spent_amount),
                "remaining": str(bl.remaining),
            }
            for bl in dossier.budget_lines.all()
        ],
        "stages": stage_finance,
        "current_stage": dossier.current_stage,
        "status": dossier.status,
        "active_stage_label": _stage_label(dossier.current_stage),
        "approval_hint": "اعتماد التبويب النشط فقط (وثيقة/خطة/إغلاق/لوحة) — البطاقة بلا اعتماد",
        "workspaces": workspaces_payload(dossier),
    }


def public_approval_payload(approval: ApprovalRequest) -> dict:
    dossier = approval.dossier
    migrate_dossier_catalog(dossier)
    stage = approval.stage
    sections = []
    if stage:
        kind = "closure" if stage.key == "close" else "document"
        for sdef in catalog.sections_for_stage(kind, stage.key):
            sec = dossier.sections.filter(kind=kind, key=sdef["key"]).first()
            sections.append(
                {
                    "key": sdef["key"],
                    "label": sdef["label"],
                    "data": sec.data if sec else {},
                    "status": sec.status if sec else "empty",
                    "fields": sdef["fields"],
                }
            )
    elif approval.scope in {w["key"] for w in catalog.WORKSPACES}:
        kind_map = {
            "document": "document",
            "closure": "closure",
            "approvals": "approvals",
            "plan": "plan",
        }
        kind = kind_map.get(approval.scope)
        if kind == "plan":
            for key in catalog.plan_phase_keys():
                sec = dossier.sections.filter(kind="plan", key=key).first()
                sections.append(
                    {
                        "key": key,
                        "label": key,
                        "data": sec.data if sec else {},
                        "status": sec.status if sec else "empty",
                        "fields": [],
                    }
                )
        elif kind:
            for sdef in catalog._sections_for_kind(kind):
                sec = dossier.sections.filter(kind=kind, key=sdef["key"]).first()
                sections.append(
                    {
                        "key": sdef["key"],
                        "label": sdef["label"],
                        "data": sec.data if sec else {},
                        "status": sec.status if sec else "empty",
                        "fields": sdef["fields"],
                    }
                )
    return {
        "token": approval.token,
        "usable": approval.is_usable,
        "decision": approval.decision,
        "expires_at": approval.expires_at,
        "scope": approval.scope,
        "note": approval.note,
        "dossier": {
            "code": dossier.code,
            "project_name": dossier.project.name,
            "marketing_name": dossier.marketing_name,
            "sponsor_name": dossier.sponsor_name,
            "manager_name": (
                (dossier.manager.get_full_name() or dossier.manager.username) if dossier.manager_id else ""
            ),
            "current_stage": dossier.current_stage,
            "status": dossier.status,
        },
        "approver": {
            "name": approval.recipient_name or (approval.payload_snapshot or {}).get("approver_name") or "",
            "role": (approval.payload_snapshot or {}).get("approver_role") or "",
            "email": approval.recipient_email or "",
        },
        "workspaces": workspaces_payload(dossier),
        "stage": (
            {
                "order": stage.order,
                "key": stage.key,
                "status": stage.status,
                "deliverable_title": stage.deliverable_title,
            }
            if stage
            else None
        ),
        "sections": sections,
        "snapshot": approval.payload_snapshot,
    }
