from copy import deepcopy

from django.db import migrations


ZAAD_ROLES = {
    "admin": True,
    "manager": True,
    "employee": True,
    "user": True,
    "donor": False,
    "supplier": False,
    "representative": False,
    "beneficiary": False,
}


def forwards(apps, schema_editor):
    PlatformSetting = apps.get_model("core", "PlatformSetting")
    obj, _ = PlatformSetting.objects.get_or_create(pk=1)
    if not obj.roles_can_login:
        obj.roles_can_login = deepcopy(ZAAD_ROLES)
    # زاد: مدفوعات و GPS مطفأة؛ جمع اسم اختياري
    obj.sponsorship_payments_enabled = False
    obj.sponsorship_gps_documentation = False
    if not obj.sponsorship_collect_donor_data:
        obj.sponsorship_collect_donor_data = "name_optional"
    obj.save()


def backwards(apps, schema_editor):
    pass


class Migration(migrations.Migration):
    dependencies = [
        ("core", "0003_configurable_platform_model"),
    ]

    operations = [
        migrations.RunPython(forwards, backwards),
    ]
