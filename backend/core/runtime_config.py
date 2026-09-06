"""قراءة إعدادات التشغيل من PlatformSetting — O(1) مع تخزين مؤقت خفيف."""
from __future__ import annotations

import time

from .models import PlatformSetting, default_roles_can_login

_CACHE: dict = {"t": 0.0, "obj": None}
_CACHE_TTL = 1.0  # ثانية — يكفي لتجنّب N+1 داخل نفس الطلب


def clear_runtime_config_cache() -> None:
    _CACHE["obj"] = None
    _CACHE["t"] = 0.0


def get_settings() -> PlatformSetting:
    now = time.monotonic()
    if _CACHE["obj"] is None or (now - _CACHE["t"]) > _CACHE_TTL:
        _CACHE["obj"] = PlatformSetting.load()
        _CACHE["t"] = now
    return _CACHE["obj"]


def payments_enabled() -> bool:
    return bool(get_settings().sponsorship_payments_enabled)


def gps_documentation_enabled() -> bool:
    return bool(get_settings().sponsorship_gps_documentation)


def donor_data_policy() -> str:
    return (
        get_settings().sponsorship_collect_donor_data
        or PlatformSetting.DONOR_DATA_NAME_OPTIONAL
    )


def roles_can_login_map() -> dict:
    raw = get_settings().roles_can_login
    base = default_roles_can_login()
    if isinstance(raw, dict) and raw:
        for key, val in raw.items():
            if key in base:
                base[key] = bool(val)
        return base
    return base


def role_can_login(role: str) -> bool:
    return bool(roles_can_login_map().get(role, False))
