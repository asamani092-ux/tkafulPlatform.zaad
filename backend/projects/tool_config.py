"""
مخطّط إعدادات كل أداة مشروع (config JSON) + تحقّق مركزي + بيانات واجهة.
مصدر الحقيقة الوحيد للمفاتيح المقبولة لكل أداة (موثّق في PROJECT_TOOLS.md).
- المفاتيح غير المعرّفة تُرفض (Scope Precision).
- التحقق من النوع لكل مفتاح.
- schema_payload() يعرّض المخطط للواجهة مع تسميات عربية.
التعقيد: O(K) لعدد مفاتيح config المُرسلة.
"""
from __future__ import annotations

from rest_framework import serializers

# نوع كل مفتاح: "bool" | "int" | "number" | "str" | "latlng"
TOOL_CONFIG_SCHEMA: dict[str, dict[str, str]] = {
    "map": {
        "default_center": "latlng",  # [lat, lng]
        "default_zoom": "int",  # 1..20
    },
    "sponsorships": {
        "show_target_amount": "bool",
        "target_amount": "number",  # >= 0
    },
    "volunteering": {
        "show_opportunities": "bool",
    },
    "services": {
        "request_form": "str",  # "service" | "water_supply"
        "show_request_button": "bool",
    },
    "reports": {
        "public": "bool",
    },
}

# تسميات عربية + خيارات لبناء نموذج مُولَّد من المخطط (مصدر واحد مع SCHEMA)
TOOL_CONFIG_UI: dict[str, dict[str, dict]] = {
    "map": {
        "default_center": {
            "label": "مركز الخريطة الافتراضي",
            "hint": "خط العرض ثم خط الطول",
        },
        "default_zoom": {
            "label": "مستوى التكبير الافتراضي",
            "hint": "من 1 إلى 20",
            "min": 1,
            "max": 20,
        },
    },
    "sponsorships": {
        "show_target_amount": {
            "label": "إظهار المبلغ المستهدف",
        },
        "target_amount": {
            "label": "المبلغ المستهدف",
            "hint": "بالريال، صفر أو أكثر",
            "min": 0,
        },
    },
    "volunteering": {
        "show_opportunities": {
            "label": "إظهار فرص التطوع",
        },
    },
    "services": {
        "request_form": {
            "label": "نموذج الطلب المرتبط",
            "choices": [
                {"value": "service", "label": "طلب خدمة عام"},
                {"value": "water_supply", "label": "طلب سقيا"},
            ],
        },
        "show_request_button": {
            "label": "إظهار زر تقديم الطلب",
        },
    },
    "reports": {
        "public": {
            "label": "إتاحة التقارير للعرض العام",
        },
    },
}

_REQUEST_FORMS = {"service", "water_supply"}


def _check_value(tool_key: str, key: str, kind: str, value):
    if kind == "bool":
        if not isinstance(value, bool):
            raise serializers.ValidationError({key: "قيمة منطقية مطلوبة (true/false)"})
    elif kind == "int":
        if isinstance(value, bool) or not isinstance(value, int):
            raise serializers.ValidationError({key: "عدد صحيح مطلوب"})
        if key == "default_zoom" and not (1 <= value <= 20):
            raise serializers.ValidationError({key: "المقياس بين 1 و20"})
    elif kind == "number":
        if isinstance(value, bool) or not isinstance(value, (int, float)):
            raise serializers.ValidationError({key: "قيمة رقمية مطلوبة"})
        if key == "target_amount" and value < 0:
            raise serializers.ValidationError({key: "قيمة غير سالبة مطلوبة"})
    elif kind == "str":
        if not isinstance(value, str):
            raise serializers.ValidationError({key: "قيمة نصية مطلوبة"})
        if key == "request_form" and value not in _REQUEST_FORMS:
            raise serializers.ValidationError({key: f"القيمة خارج الخيارات: {sorted(_REQUEST_FORMS)}"})
    elif kind == "latlng":
        if (
            not isinstance(value, (list, tuple))
            or len(value) != 2
            or any(isinstance(v, bool) or not isinstance(v, (int, float)) for v in value)
        ):
            raise serializers.ValidationError({key: "إحداثيات [lat, lng] مطلوبة"})
        lat, lng = value
        if not (-90 <= lat <= 90) or not (-180 <= lng <= 180):
            raise serializers.ValidationError({key: "إحداثيات خارج النطاق"})


def validate_tool_config(tool_key: str, config) -> dict:
    """يتحقق من config أداة ضد مخطّطها، أو يرمي ValidationError. يعيد dict نظيفاً."""
    if config in (None, ""):
        return {}
    if not isinstance(config, dict):
        raise serializers.ValidationError({"config": "يجب أن تكون الإعدادات كائن JSON"})
    schema = TOOL_CONFIG_SCHEMA.get(tool_key, {})
    unknown = set(config.keys()) - set(schema.keys())
    if unknown:
        raise serializers.ValidationError(
            {"config": f"مفاتيح غير معرّفة لأداة {tool_key}: {sorted(unknown)}"}
        )
    for key, kind in schema.items():
        if key in config and config[key] is not None:
            _check_value(tool_key, key, kind, config[key])
    return config


def schema_payload() -> dict:
    """
    حمولة واجهة: لكل أداة مفاتيحها مع type + label_ar + اختياري choices/min/max.
    يبقى TOOL_CONFIG_SCHEMA مصدر الأنواع؛ TOOL_CONFIG_UI يزوّد العرض فقط.
    """
    out: dict[str, dict[str, dict]] = {}
    for tool_key, fields in TOOL_CONFIG_SCHEMA.items():
        ui = TOOL_CONFIG_UI.get(tool_key, {})
        out[tool_key] = {}
        for key, kind in fields.items():
            meta = dict(ui.get(key, {}))
            meta["type"] = kind
            meta.setdefault("label", key)
            out[tool_key][key] = meta
    return out
