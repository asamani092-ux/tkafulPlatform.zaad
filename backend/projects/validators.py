"""Validators for platform project fields."""
import re

from django.core.exceptions import ValidationError
from django.core.validators import URLValidator


_HTTPS_URL = URLValidator(schemes=["https"])


def validate_https_donation_url(value: str) -> None:
    """Donation links must be well-formed HTTPS URLs."""
    if not value:
        return
    _HTTPS_URL(value)
    if not re.match(r"^https://[^\s/$.?#].[^\s]*$", value, re.IGNORECASE):
        raise ValidationError("رابط التبرع غير صالح — يجب أن يبدأ بـ https://")
