"""
بذر بيانات تجريبية لوحدة «كفالات السقيا» (متبرّع + كفالات بإحداثيات بالرياض).
idempotent عبر (external_source, external_id). يُستخدم لعرض مشروع سقيا على الخارطة متعددة المشاريع.
"""
from django.contrib.auth.models import User
from django.core.management.base import BaseCommand
from django.db import transaction

from saqya.models import Sponsorship

# (external_id, type, amount, lat, lng, beneficiaries, status, location)
SPONSORSHIPS = [
    ("sp-1", "مسجد", 5000, 24.774, 46.738, 120, "completed", "حي النخيل"),
    ("sp-2", "مدرسة", 3000, 24.699, 46.690, 60, "in_progress", "حي العليا"),
    ("sp-3", "حديقة", 2000, 24.735, 46.778, 3, "approved", "حي الروضة"),
    ("sp-4", "مسجد", 4500, 24.690, 46.726, 90, "completed", "حي الملز"),
    ("sp-5", "مسجد", 3500, 24.756, 46.816, 45, "in_progress", "حي النسيم"),
    ("sp-6", "مدرسة", 2800, 24.812, 46.776, 30, "approved", "حي اليرموك"),
]


class Command(BaseCommand):
    help = "بذر بيانات تجريبية لكفالات السقيا — idempotent"

    @transaction.atomic
    def handle(self, *args, **options):
        donor, _ = User.objects.get_or_create(
            username="saqya_demo_donor",
            defaults={"email": "donor@saqya.demo", "first_name": "متبرّع", "last_name": "تجريبي"},
        )
        for ext_id, stype, amount, lat, lng, benef, status, location in SPONSORSHIPS:
            Sponsorship.objects.update_or_create(
                external_source="seed",
                external_id=ext_id,
                defaults={
                    "donor": donor,
                    "amount": amount,
                    "type": stype,
                    "location": location,
                    "latitude": lat,
                    "longitude": lng,
                    "beneficiaries_count": benef,
                    "status": status,
                    "priority": "normal",
                },
            )
        self.stdout.write(self.style.SUCCESS(f"Saqya sponsorships: {len(SPONSORSHIPS)} upserted"))
