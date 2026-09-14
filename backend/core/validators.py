"""تحقق HTTPS وروابط التواصل."""
import re

from django.core.exceptions import ValidationError
from django.core.validators import URLValidator

_HTTPS_URL = URLValidator(schemes=["https"])
_PHONE = re.compile(r"^[+\d][\d\s\-()]{7,24}$")


def validate_https_url(value: str, field_ar: str = "الرابط") -> None:
    if not value:
        return
    try:
        _HTTPS_URL(value)
    except ValidationError:
        raise ValidationError(f"{field_ar} يجب أن يبدأ بـ https://")


def validate_phone(value: str) -> None:
    if not value:
        return
    if not _PHONE.match(value.strip()):
        raise ValidationError("رقم الهاتف غير صالح")
