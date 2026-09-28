"""مزامنة عضويات الراعي/المدير/المعتمد لكل ملفات المشاريع — إصلاح بيانات قديمة. O(D)."""
from django.core.management.base import BaseCommand

from projectdocs.models import ProjectDossier
from projectdocs.services import sync_dossier_role_memberships


class Command(BaseCommand):
    help = "يربط حسابات الأدوار من البريد ويضمن عضوية المشروع لكل ملف"

    def handle(self, *args, **options):
        total = 0
        for dossier in ProjectDossier.objects.select_related(
            "project", "sponsor", "manager", "approver"
        ).iterator(chunk_size=100):
            sync_dossier_role_memberships(dossier)
            total += 1
        self.stdout.write(self.style.SUCCESS(f"تمت مزامنة {total} ملفاً"))
