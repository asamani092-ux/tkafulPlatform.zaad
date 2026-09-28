from django.db import migrations, models


def backfill_plan_phase_sections(apps, schema_editor):
    ProjectDossier = apps.get_model("projectdocs", "ProjectDossier")
    DossierSection = apps.get_model("projectdocs", "DossierSection")
    keys = ("define", "prepare", "plan", "execute", "close")
    for dossier in ProjectDossier.objects.all().iterator():
        existing = set(
            DossierSection.objects.filter(dossier=dossier, kind="plan").values_list("key", flat=True)
        )
        rows = [
            DossierSection(dossier=dossier, kind="plan", key=key, data={}, status="empty")
            for key in keys
            if key not in existing
        ]
        if rows:
            DossierSection.objects.bulk_create(rows)


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("projectdocs", "0005_card_sections_execution_dates"),
    ]

    operations = [
        migrations.AddField(
            model_name="stageactivity",
            name="locked",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="stageactivity",
            name="source",
            field=models.CharField(default="plan", max_length=20),
        ),
        migrations.AlterField(
            model_name="dossiersection",
            name="kind",
            field=models.CharField(
                choices=[
                    ("card", "بطاقة المشروع"),
                    ("document", "وثيقة المشروع"),
                    ("plan", "الخطة التنفيذية"),
                    ("closure", "وثيقة الإغلاق"),
                ],
                max_length=20,
            ),
        ),
        migrations.RunPython(backfill_plan_phase_sections, noop_reverse),
    ]
