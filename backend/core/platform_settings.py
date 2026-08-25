"""إعدادات المنصّة — صف واحد + صفحات ثابتة.
التعقيد: load O(1)؛ public payload O(P) لعدد الصفحات المنشورة.
"""
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.validators import EmailValidator

from .models import PlatformSetting, StaticPage
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
)

ADMIN_SETTING_KEYS = PUBLIC_SETTING_KEYS


def settings_to_dict(obj: PlatformSetting) -> dict:
    return {k: getattr(obj, k) for k in ADMIN_SETTING_KEYS}


def public_payload() -> dict:
    obj = PlatformSetting.load()
    pages = StaticPage.objects.filter(is_published=True).values("slug", "title", "body")
    data = settings_to_dict(obj)
    data["pages"] = list(pages)
    return data


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
    for flag in ("show_map", "show_services", "show_volunteering"):
        if flag in data:
            obj.__setattr__(flag, bool(data[flag]))
    obj.full_clean()
    obj.save()
    return obj
