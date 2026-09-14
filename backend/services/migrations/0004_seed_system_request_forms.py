# Generated manually for UAT Phase 3 — seed system request forms + backfill submissions.

from django.db import migrations


def forwards(apps, schema_editor):
    # استيراد المنطق الحيّ لضمان تطابق المخطط مع الكود
    from services.legacy_forms import backfill_legacy_into_submissions

    backfill_legacy_into_submissions()


def backwards(apps, schema_editor):
    from services.legacy_forms import reverse_system_forms_and_mirrored

    reverse_system_forms_and_mirrored()


class Migration(migrations.Migration):

    dependencies = [
        ("services", "0003_requestform_requestsubmission"),
        ("projects", "0005_project_type"),
    ]

    operations = [
        migrations.RunPython(forwards, backwards),
    ]
