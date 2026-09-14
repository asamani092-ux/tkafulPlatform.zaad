"""إعدادات المنصّة — صف واحد + صفحات ثابتة.
التعقيد: load O(1)؛ public payload O(P) لعدد الصفحات المنشورة.
"""
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.validators import EmailValidator

from .models import (
    ZAAD_ROLES_CAN_LOGIN,
    PlatformSetting,
    StaticPage,
    default_roles_can_login,
)
from .validators import validate_https_url, validate_phone

PUBLIC_SETTING_KEYS = (
    "platform_name",
    "logo_url",
    "contact_email",
    "contact_phone",
    "address",
    "social_links",
    "show_map",
    "show_services",
    "show_volunteering",
    "roles_can_login",
    "sponsorship_payments_enabled",
    "sponsorship_gps_documentation",
    "sponsorship_collect_donor_data",
)

ADMIN_SETTING_KEYS = PUBLIC_SETTING_KEYS

DONOR_DATA_VALUES = {
    PlatformSetting.DONOR_DATA_NONE,
    PlatformSetting.DONOR_DATA_NAME_OPTIONAL,
    PlatformSetting.DONOR_DATA_FULL,
}


def settings_to_dict(obj: PlatformSetting) -> dict:
    data = {k: getattr(obj, k) for k in ADMIN_SETTING_KEYS}
    roles = data.get("roles_can_login") or {}
    if not isinstance(roles, dict) or not roles:
        data["roles_can_login"] = default_roles_can_login()
    else:
        merged = default_roles_can_login()
        for key, val in roles.items():
            if key in merged:
                merged[key] = bool(val)
        data["roles_can_login"] = merged
    return data


def public_payload() -> dict:
    obj = PlatformSetting.load()
    pages = StaticPage.objects.filter(is_published=True).values("slug", "title", "body")
    data = settings_to_dict(obj)
    data["pages"] = list(pages)
    return data


def _clean_roles_can_login(value) -> dict:
    if value is None:
        return default_roles_can_login()
    if not isinstance(value, dict):
        raise DjangoValidationError({"roles_can_login": "يجب أن يكون كائناً"})
    cleaned = default_roles_can_login()
    unknown = set(value.keys()) - set(ZAAD_ROLES_CAN_LOGIN.keys())
    if unknown:
        raise DjangoValidationError(
            {"roles_can_login": f"مفاتيح غير معروفة: {', '.join(sorted(unknown))}"}
        )
    for key, val in value.items():
        cleaned[key] = bool(val)
    if not cleaned.get("admin", True):
        raise DjangoValidationError({"roles_can_login": "لا يمكن تعطيل دخول المشرف"})
    return cleaned


def apply_settings_patch(data: dict) -> PlatformSetting:
    obj = PlatformSetting.load()
    if "platform_name" in data:
        obj.platform_name = str(data["platform_name"] or "").strip()
    if "logo_url" in data:
        url = str(data["logo_url"] or "").strip()
        validate_https_url(url, "شعار المنصّة")
        obj.logo_url = url
    if "contact_email" in data:
        email = str(data["contact_email"] or "").strip()
        if email:
            EmailValidator(message="البريد الإلكتروني غير صالح")(email)
        obj.contact_email = email
    if "contact_phone" in data:
        phone = str(data["contact_phone"] or "").strip()
        validate_phone(phone)
        obj.contact_phone = phone
    if "address" in data:
        obj.address = str(data["address"] or "").strip()
    if "social_links" in data:
        links = data["social_links"]
        if links is None:
            links = {}
        if not isinstance(links, dict):
            raise DjangoValidationError("روابط التواصل يجب أن تكون كائناً")
        cleaned = {}
        for key, url in links.items():
            val = str(url or "").strip()
            validate_https_url(val, f"رابط {key}")
            if val:
                cleaned[str(key)] = val
        obj.social_links = cleaned
    for flag in (
        "show_map",
        "show_services",
        "show_volunteering",
        "sponsorship_payments_enabled",
        "sponsorship_gps_documentation",
    ):
        if flag in data:
            setattr(obj, flag, bool(data[flag]))
    if "roles_can_login" in data:
        obj.roles_can_login = _clean_roles_can_login(data["roles_can_login"])
    if "sponsorship_collect_donor_data" in data:
        policy = str(data["sponsorship_collect_donor_data"] or "").strip()
        if policy not in DONOR_DATA_VALUES:
            raise DjangoValidationError(
                {"sponsorship_collect_donor_data": "قيمة غير صالحة"}
            )
        obj.sponsorship_collect_donor_data = policy
    obj.full_clean()
    obj.save()
    from .runtime_config import clear_runtime_config_cache

    clear_runtime_config_cache()
    return obj
