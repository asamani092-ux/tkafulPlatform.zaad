"""
منطق أعمال نظام الخرائط:
- validate_item_data: التحقق الديناميكي الوحيد لكل كتابة على MapItem.data — O(F+K).
- filter_public_item_payload: الفلتر المركزي الوحيد للحمولة العامة — O(F) لكل عنصر.
- mask_small_count: إخفاء PDPL للتجميعات < 5 (محفوظ من impact_map).
لا توجد فلترة لكل endpoint — كل الواجهات العامة تمر من هنا (D-07).
"""
import datetime
import re

from django.db.models import Count, Sum
from rest_framework import serializers

from .models import Map, MapContribution, MapItem, MapItemField, MapLayer


# ============ PDPL ============
def mask_small_count(value: int):
    """الخصوصية: أي عدّاد مجمّع أقل من 5 لا يُكشف كرقم صحيح."""
    if value < 5:
        return "<5"
    return value


# ============ التحقق الديناميكي ============
def _coerce_value(field: MapItemField, value):
    """يتحقق من قيمة واحدة حسب نوع الحقل ويعيدها منسّقة، أو يرمي ValidationError."""
    if value is None:
        if field.required:
            raise serializers.ValidationError({field.key: "هذا الحقل مطلوب"})
        return None

    if field.type == "text":
        if not isinstance(value, str):
            raise serializers.ValidationError({field.key: "قيمة نصية مطلوبة"})
        return value

    if field.type == "number":
        if isinstance(value, bool) or not isinstance(value, (int, float)):
            raise serializers.ValidationError({field.key: "قيمة رقمية مطلوبة"})
        return value

    if field.type == "boolean":
        if not isinstance(value, bool):
            raise serializers.ValidationError({field.key: "قيمة منطقية مطلوبة (true/false)"})
        return value

    if field.type == "select":
        options = field.options or []
        allowed = [o.get("value") if isinstance(o, dict) else o for o in options]
        if value not in allowed:
            raise serializers.ValidationError(
                {field.key: f"القيمة خارج الخيارات المسموحة: {allowed}"}
            )
        return value

    if field.type == "date":
        if not isinstance(value, str):
            raise serializers.ValidationError({field.key: "تاريخ بصيغة YYYY-MM-DD مطلوب"})
        try:
            datetime.date.fromisoformat(value)
        except ValueError:
            raise serializers.ValidationError({field.key: "تاريخ بصيغة YYYY-MM-DD مطلوب"})
        return value

    raise serializers.ValidationError({field.key: "نوع حقل غير مدعوم"})


def validate_item_data(map_obj: Map, data: dict, partial: bool = False, current: dict | None = None) -> dict:
    """
    يتحقق من قاموس data ضد تعريفات MapItemField للخريطة.
    - المفاتيح غير المعرّفة تُرفض (Scope Precision).
    - partial=True: يتحقق من المفاتيح المرسلة فقط ويُدمج فوق current.
    التعقيد: O(F + K) حيث F عدد الحقول المعرّفة وK حجم القاموس المُرسل.
    """
    if data is None:
        data = {}
    if not isinstance(data, dict):
        raise serializers.ValidationError({"data": "يجب أن تكون البيانات كائن JSON"})

    fields = {f.key: f for f in map_obj.item_fields.all()}
    unknown = set(data.keys()) - set(fields.keys())
    if unknown:
        raise serializers.ValidationError(
            {"data": f"حقول غير معرّفة في مخطط الخريطة: {sorted(unknown)}"}
        )

    cleaned = dict(current or {}) if partial else {}
    for key, field in fields.items():
        if key in data:
            cleaned_value = _coerce_value(field, data[key])
            if cleaned_value is None:
                cleaned.pop(key, None)
            else:
                cleaned[key] = cleaned_value
        elif not partial:
            if field.required:
                raise serializers.ValidationError({key: "هذا الحقل مطلوب"})
    # في وضع partial: تأكد أن الحقول الإلزامية ما زالت موجودة بعد الدمج
    if partial:
        for key, field in fields.items():
            if field.required and key not in cleaned:
                raise serializers.ValidationError({key: "هذا الحقل مطلوب"})
    return cleaned


# ============ الفلتر المركزي للحمولة العامة ============
def filter_public_item_payload(item: MapItem, public_field_keys: set[str]) -> dict:
    """
    الفلتر المركزي الوحيد: يُرجع تمثيل عنصر عام بحقول is_public=True فقط.
    يُستدعى حصراً على عناصر الطبقات العامة. التعقيد O(F).
    """
    return {
        "id": item.id,
        "layer_id": item.layer_id,
        "lat": item.lat,
        "lng": item.lng,
        "name": item.name,
        "icon": item.icon,
        "data": {k: v for k, v in (item.data or {}).items() if k in public_field_keys},
    }


def build_public_map_detail(map_obj: Map) -> dict:
    """
    الحمولة العامة الكاملة لخريطة: طبقات عامة + حقول عامة + عناصر مفلترة.
    التعقيد: O(L + F + N·F) مع prefetch (بدون N+1).
    """
    public_layers = list(map_obj.public_layers().order_by("order", "name"))
    public_layer_ids = {l.id for l in public_layers}
    public_fields = list(map_obj.public_fields().order_by("order", "key"))
    public_keys = {f.key for f in public_fields}

    items = (
        MapItem.objects.filter(map=map_obj, status="active", layer_id__in=public_layer_ids)
        .order_by("layer_id", "name")
    )
    return {
        "id": map_obj.id,
        "title": map_obj.title,
        "description": map_obj.description,
        "visibility": map_obj.visibility,
        "icon_set": map_obj.icon_set,
        "color_scheme": map_obj.color_scheme,
        "project": {
            "id": map_obj.project_id,
            "slug": map_obj.project.slug,
            "name": map_obj.project.name,
            "brand_color": map_obj.project.brand_color,
        },
        "layers": [
            {"id": l.id, "name": l.name, "order": l.order, "style": l.style}
            for l in public_layers
        ],
        "fields": [
            {
                "key": f.key, "label": f.label, "type": f.type,
                "required": f.required, "options": f.options, "order": f.order,
            }
            for f in public_fields
        ],
        "items": [filter_public_item_payload(i, public_keys) for i in items],
    }


def public_maps_index(project_slug: str | None = None) -> list[dict]:
    """
    فهرس الخرائط المعلنة (public/mixed) للمشاريع النشطة — للمجمّع الموحّد /map.
    التعقيد: O(M) مع select_related للمشروع.
    """
    qs = (
        Map.objects.filter(
            visibility__in=["public", "mixed"],
            published_at__isnull=False,
            project__is_active=True,
        )
        .exclude(project__status__in=["draft", "archived"])
        .select_related("project")
        .annotate(items_count=Count("items", distinct=True))
    )
    if project_slug:
        qs = qs.filter(project__slug=project_slug)
    return [
        {
            "id": m.id,
            "title": m.title,
            "description": m.description,
            "visibility": m.visibility,
            "items_count": m.items_count,
            "project": {
                "id": m.project_id,
                "slug": m.project.slug,
                "name": m.project.name,
                "brand_color": m.project.brand_color,
            },
        }
        for m in qs
    ]


def build_map_summary(map_obj: Map) -> dict:
    """ملخص مجمّع عام مع إخفاء PDPL (<5) للعدّادات الحسّاسة."""
    contributions = MapContribution.objects.filter(map=map_obj)
    fulfilled = contributions.filter(status="fulfilled").aggregate(
        n=Count("id"), qty=Sum("quantity")
    )
    return {
        "items_active": MapItem.objects.filter(
            map=map_obj, status="active", layer__visibility="public"
        ).count(),
        "layers_public": map_obj.public_layers().count(),
        "contributions_pending": contributions.filter(status="pending").count(),
        "contributions_fulfilled": mask_small_count(int(fulfilled["n"] or 0)),
        "quantity_fulfilled": int(fulfilled["qty"] or 0),
    }


# ============ مساهمات الجمهور ============
def validate_saudi_phone(value: str) -> str:
    """نفس قاعدة impact_map: جوال سعودي 5XXXXXXXX."""
    digits = re.sub(r"\D", "", value or "")
    if digits.startswith("966"):
        digits = digits[3:]
    if digits.startswith("0"):
        digits = digits[1:]
    if not re.fullmatch(r"5\d{8}", digits):
        raise serializers.ValidationError("رقم الجوال غير صالح (5XXXXXXXX)")
    return digits
