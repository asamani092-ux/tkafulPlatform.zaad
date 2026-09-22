# Generated manually for card tab tables + execution dates

from django.db import migrations, models


def backfill_card_sections(apps, schema_editor):
    ProjectDossier = apps.get_model("projectdocs", "ProjectDossier")
    DossierSection = apps.get_model("projectdocs", "DossierSection")
    keys = ("indicators", "phases", "outputs", "similar_experiences", "project_budget")
    for dossier in ProjectDossier.objects.all().iterator():
        existing = set(
            DossierSection.objects.filter(dossier=dossier, kind="card").values_list("key", flat=True)
        )
        to_create = [
            DossierSection(dossier=dossier, kind="card", key=key, data={}, status="empty")
            for key in keys
            if key not in existing
        ]
        if to_create:
            DossierSection.objects.bulk_create(to_create)


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("projectdocs", "0004_dossier_workspaces"),
    ]

    operations = [
        migrations.AddField(
            model_name="projectdossier",
            name="execution_start",
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="projectdossier",
            name="execution_end",
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name="dossiersection",
            name="kind",
            field=models.CharField(
                choices=[
                    ("card", "بطاقة المشروع"),
                    ("document", "وثيقة المشروع"),
                    ("closure", "وثيقة الإغلاق"),
                ],
                max_length=20,
            ),
        ),
        migrations.RunPython(backfill_card_sections, noop_reverse),
    ]
