"""تعيين حالة الكفالة مع مزامنة status_ref."""
from __future__ import annotations

from django.utils import timezone

from .models import Sponsorship, SponsorshipStatus
from .status_catalog import resolve_status_ref


def set_sponsorship_status(sp: Sponsorship, slug: str, *, extra_updates: dict | None = None) -> Sponsorship:
    """يحدّث status + status_ref معاً. O(1)."""
    ref = resolve_status_ref(model=SponsorshipStatus, slug=slug)
    sp.status = slug
    if ref:
        sp.status_ref = ref
    updates = {"status": slug, "updated_at": timezone.now()}
    if ref:
        updates["status_ref"] = ref
    if extra_updates:
        for key, val in extra_updates.items():
            setattr(sp, key, val)
            updates[key] = val
    sp.save(update_fields=list(updates.keys()))
    return sp
