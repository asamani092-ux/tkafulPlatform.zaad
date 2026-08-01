"""
مزامنة idempotent لبيانات impact_map إلى خريطة «تفقدهم» — نفس منطق هجرة
maps.0002 (عبر maps.sync). آمن لإعادة التشغيل: upsert للعناصر/الحقول،
والمساهمات تُنسخ مرة واحدة بوسم external_id="impact_map:<id>".

متى يلزم؟ عندما تُبذر بيانات impact_map بعد `migrate` (سيناريو المطوّر
الافتراضي: migrate ثم seed_impact_map)، أو بعد أي استيراد لاحق للمصدر.
seed_impact_map يستدعيه تلقائياً في نهايته.
"""
from django.core.management.base import BaseCommand
from django.db import transaction

from maps.sync import sync_impact_map_to_maps


class Command(BaseCommand):
    help = "مزامنة بيانات impact_map إلى خريطة «تفقدهم» في نظام الخرائط — idempotent"

    @transaction.atomic
    def handle(self, *args, **options):
        stats = sync_impact_map_to_maps()
        if stats.get("skipped"):
            self.stdout.write(self.style.WARNING(f"SKIPPED: {stats['skipped']}"))
            return
        self.stdout.write(self.style.SUCCESS(
            "Sync impact_map → maps: "
            f"map_created={stats['map_created']}, items_synced={stats['items_synced']}, "
            f"contributions_copied={stats['contributions_copied']}, "
            f"contributions_skipped={stats['contributions_skipped']}"
        ))
