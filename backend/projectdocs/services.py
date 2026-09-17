"""
منطق ملف المشروع: إنشاء، بوابات مراحل، أنشطة، اعتماد.
التعقيد: bootstrap O(S)؛ submit/approve مرحلة O(1) + تحقق أقسام المرحلة O(F).
"""
from __future__ import annotations

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
    DossierAttachment,
    DossierSection,
    DossierStage,
    ProjectDossier,
    StageActivity,
)

ACTION_DOSSIER_CREATE = "dossier_create"
ACTION_STAGE_SUBMIT = "dossier_stage_submit"
ACTION_STAGE_APPROVE = "dossier_stage_approve"
ACTION_STAGE_RETURN = "dossier_stage_return"
ACTION_APPROVAL_DECIDE = "dossier_approval_decide"


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
        manager = User.objects.filter(pk=manager_id).first()
        if not manager:
            raise ValidationError({"manager_id": "مستخدم غير موجود"})

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
        sponsor_name=card.get("sponsor_name") or "",
        sponsor_email=card.get("sponsor_email") or "",
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
        ("document", catalog.all_section_keys("document")),
        ("closure", catalog.all_section_keys("closure")),
    ):
        for key in keys:
            section_rows.append(DossierSection(dossier=dossier, kind=kind, key=key, data={}, status="empty"))
    DossierSection.objects.bulk_create(section_rows)

    stage_rows = []
    for s in catalog.STAGES:
        stage_rows.append(
            DossierStage(
                dossier=dossier,
                order=s["order"],
                key=s["key"],
                status="active" if s["order"] == 1 else "locked",
            )
        )
    DossierStage.objects.bulk_create(stage_rows)

    log_activity(
        actor=actor,
        action=ACTION_DOSSIER_CREATE,
        summary=f"إنشاء ملف مشروع {dossier.code}",
        request=request,
        target=dossier,
    )
    return dossier


def can_edit_dossier(user, dossier: ProjectDossier) -> bool:
    if not user or not user.is_authenticated:
        return False
    if is_super_admin(user):
        return True
    return dossier.manager_id == user.id


def assert_can_edit(user, dossier: ProjectDossier):
    if not can_edit_dossier(user, dossier):
        raise PermissionDenied("لا صلاحية لتعديل هذا الملف")


def assert_can_create(user):
    if not is_super_admin(user):
        raise PermissionDenied("إنشاء ملف المشروع للمشرف فقط")


def active_stage(dossier: ProjectDossier) -> DossierStage | None:
    return dossier.stages.filter(status__in=["active", "returned", "submitted"]).order_by("order").first()


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
    stage = dossier.stages.filter(key=section_def["stage"]).first()
    if not stage or stage.status not in ("active", "returned"):
        # المشرف يمكنه تعديل البطاقة/الأقسام في المسودة؛ المدير فقط المرحلة النشطة
        if not is_super_admin(user):
            raise ValidationError({"stage": "القسم خارج المرحلة النشطة"})
    cleaned = catalog.validate_section_data(kind, key, data)
    section = dossier.sections.get(kind=kind, key=key)
    if section.status == "approved" and not is_super_admin(user):
        raise ValidationError({"status": "القسم معتمد ولا يُعدَّل"})
    section.data = cleaned
    section.status = "filled" if catalog.section_is_filled(cleaned) else "empty"
    section.updated_by = user
    section.save(update_fields=["data", "status", "updated_by", "updated_at"])
    return section


@transaction.atomic
def submit_stage(*, dossier: ProjectDossier, order: int, user, request=None) -> ApprovalRequest:
    assert_can_edit(user, dossier)
    stage = dossier.stages.select_for_update().filter(order=order).first()
    if not stage:
        raise ValidationError({"order": "مرحلة غير موجودة"})
    if stage.status not in ("active", "returned"):
        raise ValidationError({"status": "لا يمكن إرسال هذه المرحلة الآن"})
    if not dossier.sponsor_email:
        raise ValidationError({"sponsor_email": "بريد الراعي مطلوب قبل الإرسال"})

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

    # إبطال طلبات سابقة معلّقة لنفس المرحلة
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
    send_approval_email(approval)
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
    return approval


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
    elif locked.scope in ("document", "closure", "card"):
        if decision == "approved":
            dossier.status = "approved" if locked.scope != "closure" else "closed"
            dossier.save(update_fields=["status", "updated_at"])
        else:
            dossier.status = "in_progress"
            dossier.save(update_fields=["status", "updated_at"])

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
    recipients = [u for u in [dossier.manager] if u]
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
def admin_decide_stage(*, dossier: ProjectDossier, order: int, decision: str, note: str, user, request=None):
    """اعتماد/إعادة من داخل المنصة (مشرف)."""
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
        "stages": stage_finance,
        "current_stage": dossier.current_stage,
        "status": dossier.status,
    }


def public_approval_payload(approval: ApprovalRequest) -> dict:
    dossier = approval.dossier
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
            "current_stage": dossier.current_stage,
            "status": dossier.status,
        },
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
