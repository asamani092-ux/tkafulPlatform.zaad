"""توليد slug فريد من الاسم — لا يعتمد على إدخال المستخدم."""
from __future__ import annotations

from django.utils.text import slugify


def unique_slug_from_name(model_cls, name: str, *, field: str = "slug", exclude_pk=None) -> str:
    """
    يشتق slug من الاسم مع لاحقة رقمية عند التعارض.
    التعقيد: O(k) لعدد المحاولات حتى فراغ فريد (عادة 1).
    """
    base = slugify(name or "", allow_unicode=True).strip("-") or "item"
    candidate = base
    n = 2
    while True:
        qs = model_cls.objects.filter(**{field: candidate})
        if exclude_pk is not None:
            qs = qs.exclude(pk=exclude_pk)
        if not qs.exists():
            return candidate
        candidate = f"{base}-{n}"
        n += 1
