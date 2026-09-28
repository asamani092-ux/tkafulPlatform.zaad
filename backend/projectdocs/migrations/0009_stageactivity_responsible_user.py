from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("projectdocs", "0008_approver_and_sponsor_user"),
    ]

    operations = [
        migrations.AddField(
            model_name="stageactivity",
            name="responsible_user",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="assigned_stage_activities",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AddIndex(
            model_name="stageactivity",
            index=models.Index(
                fields=["responsible_user", "auto_status"],
                name="projectdocs_respons_b8e1a0_idx",
            ),
        ),
    ]
