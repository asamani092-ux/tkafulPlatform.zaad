from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


def copy_sponsor_to_approver(apps, schema_editor):
    ProjectDossier = apps.get_model("projectdocs", "ProjectDossier")
    for row in ProjectDossier.objects.all().iterator():
        email = (row.sponsor_email or "").strip()
        name = (row.sponsor_name or "").strip()
        if not email and not name:
            continue
        ProjectDossier.objects.filter(pk=row.pk).update(
            approver_email=email or row.approver_email,
            approver_name=name or row.approver_name,
        )


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("projectdocs", "0007_activity_executed_weeks"),
    ]

    operations = [
        migrations.AddField(
            model_name="projectdossier",
            name="sponsor",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="sponsored_dossiers",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AddField(
            model_name="projectdossier",
            name="approver",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="approver_dossiers",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AddField(
            model_name="projectdossier",
            name="approver_name",
            field=models.CharField(blank=True, max_length=200),
        ),
        migrations.AddField(
            model_name="projectdossier",
            name="approver_email",
            field=models.EmailField(blank=True, max_length=254),
        ),
        migrations.AddIndex(
            model_name="projectdossier",
            index=models.Index(fields=["approver_email"], name="projectdocs_approve_email_idx"),
        ),
        migrations.RunPython(copy_sponsor_to_approver, noop_reverse),
    ]
