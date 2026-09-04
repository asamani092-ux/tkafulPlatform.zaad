"""مساعدات حالات الكفالة — زراعة ومزامنة status_ref."""
from __future__ import annotations

# زاد (نشطة) + تراثية (خامدة) للحفاظ على التاريخ
ZAAD_STATUSES = [
    ("available", "متاحة", 10, True),
    ("sponsored", "مكفولة", 20, True),
    ("prepared", "مجهّزة", 30, True),
    ("delivered", "مُسلَّمة", 40, True),
]

LEGACY_STATUSES = [
    ("pending", "قيد المراجعة (قديم)", 110, False),
    ("approved", "معتمدة (قديم)", 120, False),
    ("rejected", "مرفوضة (قديم)", 130, False),
    ("in_progress", "قيد التنفيذ (قديم)", 140, False),
    ("completed", "مكتملة (قديم)", 150, False),
    ("cancelled", "ملغاة", 160, False),
]

# ترحيل دلالي من القيم القديمة إلى حالات زاد (+ cancelled للتراث)
STATUS_BACKFILL_MAP = {
    "pending": "available",
    "approved": "sponsored",
    "in_progress": "prepared",
    "completed": "delivered",
    "rejected": "cancelled",
    "cancelled": "cancelled",
    # إن كانت بالفعل من زاد
    "available": "available",
    "sponsored": "sponsored",
    "prepared": "prepared",
    "delivered": "delivered",
}


def seed_sponsorship_statuses(*, model) -> int:
    """زراعة كتالوج الحالات — idempotent. يُرجع عدد الصفوف المُنشأة."""
    created = 0
    for slug, name, order, active in ZAAD_STATUSES + LEGACY_STATUSES:
        _, was_created = model.objects.get_or_create(
            slug=slug,
            defaults={"name": name, "order": order, "is_active": active},
        )
        if was_created:
            created += 1
    return created


def resolve_status_ref(*, model, slug: str):
    return model.objects.filter(slug=slug).first()
