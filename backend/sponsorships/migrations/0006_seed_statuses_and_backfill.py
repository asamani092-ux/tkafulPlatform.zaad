# Generated manually — seed statuses + backfill

from django.db import migrations


STATUS_BACKFILL_MAP = {
    "pending": "available",
    "approved": "sponsored",
    "in_progress": "prepared",
    "completed": "delivered",
    "rejected": "cancelled",
    "cancelled": "cancelled",
    "available": "available",
    "sponsored": "sponsored",
    "prepared": "prepared",
    "delivered": "delivered",
}

ZAAD = [
    ("available", "متاحة", 10, True),
    ("sponsored", "مكفولة", 20, True),
    ("prepared", "مجهّزة", 30, True),
    ("delivered", "مُسلَّمة", 40, True),
]
LEGACY = [
    ("pending", "قيد المراجعة (قديم)", 110, False),
    ("approved", "معتمدة (قديم)", 120, False),
    ("rejected", "مرفوضة (قديم)", 130, False),
    ("in_progress", "قيد التنفيذ (قديم)", 140, False),
    ("completed", "مكتملة (قديم)", 150, False),
    ("cancelled", "ملغاة", 160, False),
]


def forwards(apps, schema_editor):
    SponsorshipStatus = apps.get_model("sponsorships", "SponsorshipStatus")
    Sponsorship = apps.get_model("sponsorships", "Sponsorship")
    for slug, name, order, active in ZAAD + LEGACY:
        SponsorshipStatus.objects.get_or_create(
            slug=slug,
            defaults={"name": name, "order": order, "is_active": active},
        )
    by_slug = {s.slug: s for s in SponsorshipStatus.objects.all()}
    before = Sponsorship.objects.count()
    for sp in Sponsorship.objects.all().iterator():
        new_slug = STATUS_BACKFILL_MAP.get(sp.status, "available")
        sp.status = new_slug
        sp.status_ref = by_slug.get(new_slug)
        sp.save(update_fields=["status", "status_ref"])
    after = Sponsorship.objects.count()
    if before != after:
        raise RuntimeError(f"integrity: sponsorship count changed {before} → {after}")


def backwards(apps, schema_editor):
    """عكس دلالي تقريبي — يُرجع الحالات التراثية إن أمكن."""
    reverse_map = {
        "available": "pending",
        "sponsored": "approved",
        "prepared": "in_progress",
        "delivered": "completed",
        "cancelled": "cancelled",
    }
    Sponsorship = apps.get_model("sponsorships", "Sponsorship")
    for sp in Sponsorship.objects.all().iterator():
        sp.status = reverse_map.get(sp.status, sp.status)
        sp.status_ref = None
        sp.save(update_fields=["status", "status_ref"])


class Migration(migrations.Migration):
    dependencies = [
        ("sponsorships", "0005_configurable_platform_model"),
    ]

    operations = [
        migrations.RunPython(forwards, backwards),
    ]
