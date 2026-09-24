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
    phases_sec = dossier.sections.filter(kind="document", key="main_phases").first()
    phase_rows = ((phases_sec.data if phases_sec else {}) or {}).get("phases") or []
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

    # 1) البيانات — تُنسخ دائماً حتى لو اعتُمدت البطاقة (مصدرها البطاقة)
    basics = by_key.get("basics")
    if basics:
        basics.data = {
            "marketing_name": dossier.marketing_name or dossier.project.name,
            "department": dossier.department or "",
            "section": dossier.section or "",
            "location": dossier.location or "",
            "execution_start": str(dossier.execution_start or ""),
            "execution_end": str(dossier.execution_end or ""),
            "sponsor_name": dossier.sponsor_name or "",
            "sponsor_email": dossier.sponsor_email or "",
            "strategic_goal": dossier.strategic_goal or "",
        }
        basics.status = "filled" if catalog.section_is_filled(basics.data) else basics.status
        basics.save(update_fields=["data", "status", "updated_at"])

    # 2) المؤشرات
    indicators = by_key.get("indicators")
    if indicators:
        prev = (indicators.data or {}).get("rows") or []
        merged = _merge_table_from_card(prev, _card_section_rows(dossier, "indicators"))
        indicators.data = {"rows": merged}
        indicators.status = "filled" if merged else indicators.status
        indicators.save(update_fields=["data", "status", "updated_at"])

    # 3) التجارب + فئة مستهدفة
    similar = by_key.get("similar_experiences")
    if similar:
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

    # 4) الأثر المنطقي — تهيئة صفوف ثابتة إن فارغ
    logical = by_key.get("logical_impact")
    if logical and not (logical.data or {}).get("rows"):
        logical.data = {"rows": catalog.default_logical_impact_rows()}
        logical.save(update_fields=["data", "updated_at"])

    # 5) المراحل الرئيسية — تهيئة المراحل الثابتة
    phases = by_key.get("main_phases")
    if phases:
        existing_phases = (phases.data or {}).get("phases")
        if not existing_phases:
            phases.data = {"phases": catalog.default_main_phases()}
            phases.save(update_fields=["data", "updated_at"])
        else:
            # ضمان وجود كل المراحل الثابتة مع الحفاظ على الأنشطة
            phases.data = {"phases": catalog.validate_section_data("document", "main_phases", {"phases": existing_phases}).get("phases")}
            phases.save(update_fields=["data", "updated_at"])

    # 6) المخصص من البطاقة (عرض فقط) داخل قسم الميزانية
    budget = by_key.get("budget")
    if budget:
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


def can_edit_locked_card_rows(user, dossier: ProjectDossier) -> bool:
    """تعديل الصفوف المنقولة من البطاقة: مشرف أو مدير الملف أو الراعي."""
    if not user or not user.is_authenticated:
        return False
    if is_super_admin(user):
        return True
    if dossier.manager_id == user.id:
        return True
    email = (getattr(user, "email", "") or "").strip().lower()
    sponsor = (dossier.sponsor_email or "").strip().lower()
    return bool(email and sponsor and email == sponsor)


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
    """مشرف عام أو المدير المعيّن على الملف فقط. الراعي لا يتجاوز القفل. O(1)."""
    if not user or not user.is_authenticated:
        return False
    if is_super_admin(user):
        return True
    return bool(dossier.manager_id and dossier.manager_id == user.id)


def workspace_def(key: str) -> dict | None:
    return next((w for w in catalog.WORKSPACES if w["key"] == key), None)


def get_workspace(dossier: ProjectDossier, key: str) -> DossierWorkspace:
    ws = dossier.workspaces.filter(key=key).first()
    if not ws:
        raise ValidationError({"workspace": "تبويب غير موجود"})
    return ws


def assert_workspace_open_for_work(user, dossier: ProjectDossier, key: str) -> DossierWorkspace:
    """الموظف والراعي يعملان على التبويب النشط فقط. المدير المعيّن والمشرف يتجاوزان القفل. O(1)."""
    ws = get_workspace(dossier, key)
    if can_bypass_workspace_gates(user, dossier):
        return ws
    if ws.status not in ("active", "returned"):
        raise ValidationError(
            {"workspace": "هذا التبويب مقفل حتى اعتماد التبويب السابق من المدير"}
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

    # فصل الوثيقة عن الإغلاق عبر تبويبات الاعتماد؛ البطاقة مفتوحة دائماً
    if kind == "document":
        assert_workspace_open_for_work(user, dossier, "document")
    elif kind == "closure":
        assert_workspace_open_for_work(user, dossier, "closure")
    elif kind == "card":
        assert_workspace_open_for_work(user, dossier, "card")
    else:
        raise ValidationError({"kind": "نوع قسم غير معروف"})
    cleaned = catalog.validate_section_data(kind, key, data)
    section = dossier.sections.get(kind=kind, key=key)
    if section.status == "approved" and not can_bypass_workspace_gates(user, dossier):
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
                "strategic_goal": dossier.strategic_goal or "",
            }

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
    if kind == "document" and key == "main_phases":
        sync_plan_from_document(dossier)
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
def decide_document_section(
    *,
    dossier: ProjectDossier,
    key: str,
    decision: str,
    user,
    note: str = "",
    request=None,
) -> DossierSection:
    """اعتماد/إعادة بطاقة وثيقة من المدير (مشرف أو راعي). O(S)."""
    if decision not in ("approved", "returned", "revoke"):
        raise ValidationError({"decision": "قرار غير صالح"})
    if not can_bypass_workspace_gates(user, dossier):
        raise PermissionDenied("اعتماد بطاقات الوثيقة للمشرف أو المدير المعيّن فقط")
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
    if not can_bypass_workspace_gates(user, dossier):
        raise PermissionDenied("اعتماد مراحل الخطة للمشرف أو المدير المعيّن فقط")
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
    """اعتماد أو إزالة اعتماد تبويب من المنصة (مشرف أو المدير المعيّن)."""
    if not can_bypass_workspace_gates(user, dossier):
        raise PermissionDenied("الاعتماد الداخلي للمشرف أو المدير المعيّن فقط")
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
