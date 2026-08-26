from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("core", "0001_platform_settings"),
    ]

    operations = [
        migrations.CreateModel(
            name="ActivityLog",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("action", models.CharField(db_index=True, max_length=40)),
                ("target_type", models.CharField(blank=True, db_index=True, max_length=80)),
                ("target_id", models.CharField(blank=True, max_length=64)),
                ("summary", models.CharField(max_length=240)),
                ("ip", models.GenericIPAddressField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "actor",
                    models.ForeignKey(
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="activity_logs",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={"ordering": ["-created_at"]},
        ),
        migrations.AddIndex(
            model_name="activitylog",
            index=models.Index(fields=["actor", "created_at"], name="core_activi_actor_i_idx"),
        ),
        migrations.AddIndex(
            model_name="activitylog",
            index=models.Index(fields=["action", "created_at"], name="core_activi_action_idx"),
        ),
    ]
