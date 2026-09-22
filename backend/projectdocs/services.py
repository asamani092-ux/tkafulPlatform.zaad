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
            status = "approved"  # بلا اعتماد
        elif w["key"] == "document":
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

    log_activity(
        actor=actor,
        action=ACTION_DOSSIER_CREATE,
        summary=f"إنشاء ملف مشروع {dossier.code}",
        request=request,
        target=dossier,
    )
    return dossier


def can_edit_dossier(user, dossier: ProjectDossier) -> bool:
    """مشرف، مدير المشروع، أو مدير الإدارة (الراعي). O(1)."""
    if not user or not user.is_authenticated:
        return False
    if is_super_admin(user):
        return True
    if dossier.manager_id == user.id:
        return True
    email = (getattr(user, "email", "") or "").strip().lower()
    sponsor = (dossier.sponsor_email or "").strip().lower()
    return bool(email and sponsor and email == sponsor)


def assert_can_edit(user, dossier: ProjectDossier):
    if not can_edit_dossier(user, dossier):
        raise PermissionDenied("لا صلاحية لتعديل هذا الملف")


def assert_can_create(user):
    if not is_super_admin(user):
        raise PermissionDenied("إنشاء ملف المشروع للمشرف فقط")


def active_stage(dossier: ProjectDossier) -> DossierStage | None:
    return dossier.stages.filter(status__in=["active", "returned", "submitted"]).order_by("order").first()


def can_bypass_workspace_gates(user, dossier: ProjectDossier) -> bool:
    """مشرف عام أو مدير الإدارة (الراعي) — وإن كان هو نفسه مدير المشروع. O(1)."""
    if not user or not user.is_authenticated:
        return False
    if is_super_admin(user):
        return True
    email = (getattr(user, "email", "") or "").strip().lower()
    sponsor = (dossier.sponsor_email or "").strip().lower()
    return bool(email and sponsor and email == sponsor)


def workspace_def(key: str) -> dict | None:
    return next((w for w in catalog.WORKSPACES if w["key"] == key), None)


def get_workspace(dossier: ProjectDossier, key: str) -> DossierWorkspace:
    ws = dossier.workspaces.filter(key=key).first()
    if not ws:
        raise ValidationError({"workspace": "تبويب غير موجود"})
    return ws


def assert_workspace_open_for_work(user, dossier: ProjectDossier, key: str) -> DossierWorkspace:
    """قفل تسلسل التبويبات على الموظف/مدير المشروع؛ مفتوح لمدير الإدارة والمشرف. O(1)."""
    ws = get_workspace(dossier, key)
    if key == "card" or can_bypass_workspace_gates(user, dossier):
        return ws
    if ws.status not in ("active", "returned"):
        raise ValidationError(
            {"workspace": "هذا التبويب مقفل حتى اعتماد التبويب السابق من مدير الإدارة"}
        )
    return ws


def workspaces_payload(dossier: ProjectDossier, user=None) -> list[dict]:
    """حالات التبويبات كما في قاعدة البيانات؛ الفتح للمدير عبر bypass_workspace_gates. O(W)."""
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
    if not sponsor_email:
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

    # فصل الوثيقة عن الإغلاق عبر تبويبات الاعتماد
    if kind == "document":
        assert_workspace_open_for_work(user, dossier, "document")
    elif kind == "closure":
        assert_workspace_open_for_work(user, dossier, "closure")
    cleaned = catalog.validate_section_data(kind, key, data)
    section = dossier.sections.get(kind=kind, key=key)
    if section.status == "approved" and not can_bypass_workspace_gates(user, dossier):
        raise ValidationError({"status": "القسم معتمد ولا يُعدَّل إلا بإعادة التبويب للتعديل"})
    section.data = cleaned
    section.status = "filled" if catalog.section_is_filled(cleaned) else "empty"
    section.updated_by = user
    section.save(update_fields=["data", "status", "updated_by", "updated_at"])
    if kind == "document" and key == "budget":
        sync_budget_lines_from_section(dossier, cleaned, user=user)
    return section


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
    assoc = Decimal(str(data.get("association_budget") or 0))
    don = Decimal(str(data.get("donation_budget") or 0))
    total = Decimal(str(data.get("total_budget") or (assoc + don)))
    dossier.budget_association = assoc
    dossier.budget_donation = don
    dossier.budget_total = total
    dossier.save(update_fields=["budget_association", "budget_donation", "budget_total", "updated_at"])

    for i, row in enumerate(rows):
        if not isinstance(row, dict):
            continue
        title = str(row.get("item") or row.get("title") or "").strip()
        if not title:
            continue
        try:
            amount = Decimal(str(row.get("amount") or 0))
        except Exception:
            amount = Decimal("0")
        key = (title, _money_key(amount))
        if key in existing:
            continue
        # نفس العنوان بمبلغ مختلف → بند جديد (تراكم تاريخي)
        bl = BudgetLine.objects.create(
            dossier=dossier,
            title=title,
            source=str(row.get("source") or ""),
            notes=str(row.get("notes") or ""),
            proposed_amount=amount,
            allocated_amount=Decimal("0"),
            spent_amount=Decimal("0"),
            sort_order=i,
        )
        BudgetTxn.objects.create(
            line=bl,
            kind="adjust",
            amount=amount,
            note="إنشاء من التكلفة المقترحة",
            created_by=user,
        )
        created.append(bl)
        existing[key] = bl
    return list(dossier.budget_lines.all())


@transaction.atomic
def allocate_budget_line(*, dossier: ProjectDossier, line_id: int, amount, user, note: str = "") -> BudgetLine:
    """مخصص الراعي/المشرف على بند. O(1)."""
    email = (getattr(user, "email", "") or "").strip().lower()
    is_sponsor = bool(email and email == (dossier.sponsor_email or "").strip().lower())
    if not (is_super_admin(user) or is_sponsor):
        raise PermissionDenied("ضبط المخصص للراعي أو المشرف فقط")
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
    assert_can_edit(user, dossier)
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


def document_closure_comparison(dossier: ProjectDossier) -> dict:
    """مقارنة أقسام الوثيقة مع الإغلاق. O(S·F)."""
    pairs = [
        ("basics", "closure_basics", "البيانات الأساسية"),
        ("team", "closure_team", "فريق العمل"),
        ("volunteers", "volunteer_contributions", "المتطوعون"),
        ("risks", "risk_log", "المخاطر"),
        ("budget", "financial_performance", "الأداء المالي / التكلفة"),
        ("budget", "final_cost", "التكلفة النهائية"),
        ("objectives_kpis", "scope_measure", "النطاق / الأهداف"),
        ("main_phases", "time_performance", "الأداء الزمني"),
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
def submit_workspace(*, dossier: ProjectDossier, key: str, user, request=None) -> ApprovalRequest:
    """إرسال تبويب (وثيقة/خطة/إغلاق/لوحة) لاعتماد مدير الإدارة. O(1)."""
    assert_can_edit(user, dossier)
    wdef = workspace_def(key)
    if not wdef or not wdef.get("needs_approval"):
        raise ValidationError({"workspace": "هذا التبويب لا يحتاج اعتماداً"})
    ws = dossier.workspaces.select_for_update().filter(key=key).first()
    if not ws:
        raise ValidationError({"workspace": "تبويب غير موجود"})
    if ws.status not in ("active", "returned"):
        raise ValidationError({"status": "لا يمكن إرسال هذا التبويب الآن"})
    if not dossier.sponsor_email:
        raise ValidationError({"sponsor_email": "بريد الراعي (مدير الإدارة) مطلوب قبل الإرسال"})

    if key == "document":
        dossier.sections.filter(kind="document", status__in=("filled", "returned", "submitted")).update(status="submitted")
    elif key == "closure":
        dossier.sections.filter(kind="closure", status__in=("filled", "returned", "submitted")).update(status="submitted")

    ws.status = "submitted"
    ws.return_note = ""
    ws.save(update_fields=["status", "return_note", "updated_at"])
    dossier.status = "pending_approval"
    dossier.save(update_fields=["status", "updated_at"])

    ApprovalRequest.objects.filter(
        dossier=dossier, scope=key, decision="pending"
    ).update(decision="expired", decided_at=timezone.now())

    approval = ApprovalRequest.create_pending(
        dossier=dossier,
        scope=key,
        payload={
            "workspace_key": key,
            "workspace_label": wdef["label"],
            "dossier_code": dossier.code,
            "project_name": dossier.project.name,
        },
    )
    send_approval_email(approval)
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
        users=[u for u in [dossier.manager] if u],
        roles=["admin"],
    )
    return approval


def _workspace_label(key: str) -> str:
    return next((w["label"] for w in catalog.WORKSPACES if w["key"] == key), key)


def _approve_workspace(dossier: ProjectDossier, key: str, *, actor=None, request=None):
    ws = dossier.workspaces.select_for_update().filter(key=key).first()
    if not ws:
        raise ValidationError({"workspace": "تبويب غير موجود"})
    ws.status = "approved"
    ws.approved_at = timezone.now()
    ws.return_note = ""
    ws.save(update_fields=["status", "approved_at", "return_note", "updated_at"])

    if key == "document":
        dossier.sections.filter(kind="document").update(status="approved")
    elif key == "closure":
        dossier.sections.filter(kind="closure").update(status="approved")

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
    elif key == "closure":
        dossier.sections.filter(kind="closure").update(status="returned")
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
    elif locked.scope in ("document", "plan", "closure", "board"):
        if decision == "approved":
            _approve_workspace(dossier, locked.scope, actor=actor, request=request)
        else:
            _return_workspace(dossier, locked.scope, note=note, actor=actor, request=request)
    elif locked.scope == "card":
        # البطاقة بلا اعتماد عمليًا
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
def admin_decide_workspace(*, dossier: ProjectDossier, key: str, decision: str, note: str, user, request=None):
    """اعتماد/إعادة تبويب من داخل المنصة (مشرف أو مدير الإدارة)."""
    if not (is_super_admin(user) or can_bypass_workspace_gates(user, dossier)):
        raise PermissionDenied("الاعتماد الداخلي للمشرف أو مدير الإدارة فقط")
    ws = dossier.workspaces.select_for_update().filter(key=key).first()
    if not ws:
        raise ValidationError({"workspace": "تبويب غير موجود"})
    if ws.status != "submitted":
        raise ValidationError({"status": "التبويب ليس بانتظار الاعتماد"})
    approval = ApprovalRequest.create_pending(
        dossier=dossier, scope=key, payload={"via": "admin", "workspace_key": key}
    )
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
