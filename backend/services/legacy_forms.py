"""
نماذج الطلبات النظامية (UAT Phase 3 / D-50).
البذرة + المرآة التراكمية من المسارات القديمة إلى RequestSubmission.
الموديلات القديمة تبقى مقروءة؛ النظام الإداري الموحّد هو النماذج الديناميكية.
"""
from __future__ import annotations

from django.db import transaction

from projects.models import Project

from .models import RequestForm, RequestSubmission, ServiceRequest, Suggestion, WaterSupplyRequest

# ثوابت slug للنماذج النظامية — ثابتة عبر البيئات
SLUG_SERVICE = "sys-service-request"
SLUG_WATER = "sys-water-supply"
SLUG_SUGGESTION = "sys-suggestion"

SYSTEM_SLUGS = (SLUG_SERVICE, SLUG_WATER, SLUG_SUGGESTION)

STATUS_MAP_SERVICE = {
    "PENDING": "PENDING",
    "APPROVED": "APPROVED",
    "REJECTED": "REJECTED",
    "DONE": "DONE",
}
STATUS_MAP_WATER = {
    "PENDING": "PENDING",
    "APPROVED": "APPROVED",
    "REJECTED": "REJECTED",
    "COMPLETED": "DONE",
}


def _project_for_slug(*candidates: str) -> Project | None:
    for slug in candidates:
        p = Project.objects.filter(slug=slug).first()
        if p:
            return p
    return Project.objects.filter(status="active", is_active=True).order_by("id").first()


def system_form_defs():
    """تعريفات البذرة — O(1)."""
    return [
        {
            "slug": SLUG_SERVICE,
            "title": "طلب خدمة",
            "description": "نموذج نظامي لطلبات الخدمات (مرحّل من النموذج الثابت).",
            "project": _project_for_slug("takaful-athar"),
            "fields_schema": [
                {"key": "service_id", "label": "معرّف الخدمة", "type": "number", "required": True},
                {"key": "beneficiary_name", "label": "اسم المستفيد", "type": "text", "required": True},
                {"key": "beneficiary_contact", "label": "وسيلة التواصل", "type": "text", "required": False},
                {"key": "details", "label": "التفاصيل", "type": "textarea", "required": False},
                {"key": "legacy_id", "label": "معرّف قديم", "type": "number", "required": False},
            ],
        },
        {
            "slug": SLUG_WATER,
            "title": "طلب سقيا ماء",
            "description": "نموذج نظامي لطلبات سقيا المساجد (مرتبط بمشروع عند التوفّر).",
            "project": _project_for_slug("saqya"),
            "fields_schema": [
                {"key": "applicant_name", "label": "اسم مقدّم الطلب", "type": "text", "required": True},
                {"key": "mobile_number", "label": "الجوال", "type": "text", "required": True},
                {"key": "applicant_role", "label": "الصفة", "type": "text", "required": True},
                {"key": "mosque_name", "label": "اسم المسجد", "type": "text", "required": True},
                {"key": "neighborhood", "label": "الحي", "type": "text", "required": True},
                {"key": "location_link", "label": "رابط الموقع", "type": "text", "required": True},
                {"key": "worshippers_count", "label": "عدد المصلّين", "type": "number", "required": True},
                {"key": "donor_exists", "label": "يوجد متبرّع", "type": "boolean", "required": False},
                {"key": "donor_name", "label": "اسم المتبرّع", "type": "text", "required": False},
                {"key": "donor_phone", "label": "جوال المتبرّع", "type": "text", "required": False},
                {"key": "project_id", "label": "معرّف المشروع", "type": "number", "required": False},
                {"key": "legacy_id", "label": "معرّف قديم", "type": "number", "required": False},
            ],
        },
        {
            "slug": SLUG_SUGGESTION,
            "title": "اقتراح مبادرة",
            "description": "نموذج نظامي للاقتراحات العامة.",
            "project": _project_for_slug("takaful-athar"),
            "fields_schema": [
                {"key": "title", "label": "العنوان", "type": "text", "required": True},
                {"key": "description", "label": "الوصف", "type": "textarea", "required": True},
                {"key": "submitted_by", "label": "مقدّم الاقتراح", "type": "text", "required": False},
                {"key": "legacy_id", "label": "معرّف قديم", "type": "number", "required": False},
            ],
        },
    ]


@transaction.atomic
def ensure_system_forms() -> dict[str, RequestForm]:
    """إنشاء/تحديث النماذج النظامية idempotent. يعيد خريطة slug→form."""
    out: dict[str, RequestForm] = {}
    for defn in system_form_defs():
        form, _ = RequestForm.objects.update_or_create(
            slug=defn["slug"],
            defaults={
                "title": defn["title"],
                "description": defn["description"],
                "project": defn["project"],
                "fields_schema": defn["fields_schema"],
                "is_active": True,
            },
        )
        out[defn["slug"]] = form
    return out


def _already_mirrored(form: RequestForm, legacy_id: int) -> bool:
    return RequestSubmission.objects.filter(
        form=form, data__legacy_id=legacy_id
    ).exists()


def mirror_service_request(obj: ServiceRequest, form: RequestForm | None = None) -> RequestSubmission | None:
    form = form or RequestForm.objects.filter(slug=SLUG_SERVICE).first()
    if not form or _already_mirrored(form, obj.id):
        return None
    return RequestSubmission.objects.create(
        form=form,
        status=STATUS_MAP_SERVICE.get(obj.status, "PENDING"),
        data={
            "service_id": obj.service_id,
            "beneficiary_name": obj.beneficiary_name,
            "beneficiary_contact": obj.beneficiary_contact,
            "details": obj.details,
            "legacy_id": obj.id,
        },
        admin_notes=f"legacy:ServiceRequest:{obj.id}",
    )


def mirror_water_request(obj: WaterSupplyRequest, form: RequestForm | None = None) -> RequestSubmission | None:
    form = form or RequestForm.objects.filter(slug=SLUG_WATER).first()
    if not form or _already_mirrored(form, obj.id):
        return None
    return RequestSubmission.objects.create(
        form=form,
        status=STATUS_MAP_WATER.get(obj.status, "PENDING"),
        data={
            "applicant_name": obj.applicant_name,
            "mobile_number": obj.mobile_number,
            "applicant_role": obj.applicant_role,
            "mosque_name": obj.mosque_name,
            "neighborhood": obj.neighborhood,
            "location_link": obj.location_link,
            "worshippers_count": obj.worshippers_count,
            "donor_exists": obj.donor_exists,
            "donor_name": obj.donor_name,
            "donor_phone": obj.donor_phone,
            "project_id": obj.project_id,
            "legacy_id": obj.id,
        },
        admin_notes=f"legacy:WaterSupplyRequest:{obj.id}",
    )


def mirror_suggestion(obj: Suggestion, form: RequestForm | None = None) -> RequestSubmission | None:
    form = form or RequestForm.objects.filter(slug=SLUG_SUGGESTION).first()
    if not form or _already_mirrored(form, obj.id):
        return None
    status = "DONE" if obj.is_reviewed else "PENDING"
    return RequestSubmission.objects.create(
        form=form,
        status=status,
        data={
            "title": obj.title,
            "description": obj.description,
            "submitted_by": obj.submitted_by,
            "legacy_id": obj.id,
        },
        admin_notes=f"legacy:Suggestion:{obj.id}",
    )


@transaction.atomic
def backfill_legacy_into_submissions() -> dict[str, int]:
    """نسخ تراكمي للبيانات القديمة → RequestSubmission. يعيد أعداد المُنشأ."""
    forms = ensure_system_forms()
    counts = {"service": 0, "water": 0, "suggestion": 0}
    for obj in ServiceRequest.objects.all().iterator():
        if mirror_service_request(obj, forms[SLUG_SERVICE]):
            counts["service"] += 1
    for obj in WaterSupplyRequest.objects.all().iterator():
        if mirror_water_request(obj, forms[SLUG_WATER]):
            counts["water"] += 1
    for obj in Suggestion.objects.all().iterator():
        if mirror_suggestion(obj, forms[SLUG_SUGGESTION]):
            counts["suggestion"] += 1
    return counts


@transaction.atomic
def reverse_system_forms_and_mirrored():
    """عكس البذرة: حذف إرسالات المرآة والنماذج النظامية فقط (لا يمسّ الجداول القديمة)."""
    RequestSubmission.objects.filter(form__slug__in=SYSTEM_SLUGS).delete()
    RequestForm.objects.filter(slug__in=SYSTEM_SLUGS).delete()
