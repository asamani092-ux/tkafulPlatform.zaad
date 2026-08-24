"""
إعدادات المنصّة — مصدر حقيقة واحد مع قيم افتراضية وسجل تراكمي.
التعقيد: get_all O(K) حيث K عدد المفاتيح المعروفة؛ patch O(M) لعدد الحقول المحدّثة.
"""
from __future__ import annotations

from typing import Any

from django.contrib.auth.models import User

from .models import PlatformSetting, PlatformSettingHistory

# مفاتيح المرحلة 1 — أنواع: bool | str
SETTING_SCHEMA: dict[str, dict[str, Any]] = {
    "water_supply_form_enabled": {"type": "bool", "default": True, "public": True},
    "public_registration_enabled": {"type": "bool", "default": True, "public": True},
    "maintenance_mode": {"type": "bool", "default": False, "public": True},
    "contact_email": {"type": "str", "default": "info@takafol-athar.com", "public": True},
    "contact_phone": {"type": "str", "default": "+966 50 123 4567", "public": True},
}

PUBLIC_KEYS = [k for k, meta in SETTING_SCHEMA.items() if meta.get("public")]


def _coerce(key: str, raw: Any) -> Any:
    meta = SETTING_SCHEMA[key]
    kind = meta["type"]
    if kind == "bool":
        if isinstance(raw, bool):
            return raw
        if isinstance(raw, str):
            return raw.lower() in ("1", "true", "yes", "on")
        return bool(raw)
    if kind == "str":
        return str(raw).strip() if raw is not None else ""
    return raw


def _defaults() -> dict[str, Any]:
    return {k: meta["default"] for k, meta in SETTING_SCHEMA.items()}


def get_settings_dict(*, public_only: bool = False) -> dict[str, Any]:
    """O(K) — دمج القيم المخزّنة مع الافتراضيات."""
    out = _defaults()
    keys = PUBLIC_KEYS if public_only else list(SETTING_SCHEMA.keys())
    stored = {
        row.key: row.value_json
        for row in PlatformSetting.objects.filter(key__in=keys)
    }
    for key in keys:
        if key in stored:
            out[key] = _coerce(key, stored[key])
    if public_only:
        return {k: out[k] for k in PUBLIC_KEYS}
    return out


def patch_settings(updates: dict[str, Any], user: User | None) -> dict[str, Any]:
    """O(M) — تحديث مفاتيح معروفة فقط + إضافة سجل تاريخي."""
    if not updates:
        return get_settings_dict()

    for key, raw in updates.items():
        if key not in SETTING_SCHEMA:
            continue
        value = _coerce(key, raw)
        row, created = PlatformSetting.objects.get_or_create(
            key=key,
            defaults={"value_json": value, "updated_by": user},
        )
        if created or row.value_json != value:
            PlatformSettingHistory.objects.create(
                key=key,
                value_json=value,
                changed_by=user,
            )
            row.value_json = value
            row.updated_by = user
            row.save(update_fields=["value_json", "updated_by", "updated_at"])
        elif row.updated_by_id != (user.id if user else None):
            row.updated_by = user
            row.save(update_fields=["updated_by", "updated_at"])

    return get_settings_dict()


def is_public_registration_enabled() -> bool:
    return bool(get_settings_dict(public_only=True).get("public_registration_enabled", True))
