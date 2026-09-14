"""بذرة إعدادات زاد — idempotent."""
from copy import deepcopy

from django.core.management.base import BaseCommand

from core.models import ZAAD_ROLES_CAN_LOGIN, PlatformSetting
from core.runtime_config import clear_runtime_config_cache
from sponsorships.models import SponsorshipStatus
from sponsorships.status_catalog import seed_sponsorship_statuses


class Command(BaseCommand):
    help = "يضبط كتلة PlatformSetting لقيم زاد ويزرع حالات الكفالة (idempotent)."

    def handle(self, *args, **options):
        obj = PlatformSetting.load()
        obj.roles_can_login = deepcopy(ZAAD_ROLES_CAN_LOGIN)
        obj.sponsorship_payments_enabled = False
        obj.sponsorship_gps_documentation = False
        obj.sponsorship_collect_donor_data = PlatformSetting.DONOR_DATA_NAME_OPTIONAL
        obj.save()
        clear_runtime_config_cache()
        created = seed_sponsorship_statuses(model=SponsorshipStatus)
        self.stdout.write(
            self.style.SUCCESS(
                f"زاد: مدفوعات=Off، GPS=Off، donor_data=name_optional، "
                f"حالات جديدة={created}، أدوار دخول محدّثة."
            )
        )
