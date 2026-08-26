from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("notifications", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="notification",
            name="notification_type",
            field=models.CharField(
                choices=[("info", "info"), ("success", "success"), ("warning", "warning"), ("action", "action")],
                default="info",
                max_length=10,
            ),
        ),
        migrations.AddField(
            model_name="notification",
            name="link",
            field=models.CharField(blank=True, max_length=300),
        ),
        migrations.AddField(
            model_name="notification",
            name="event_type",
            field=models.CharField(blank=True, db_index=True, max_length=40),
        ),
        migrations.CreateModel(
            name="NotificationPreference",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("event_type", models.CharField(max_length=40)),
                ("enabled", models.BooleanField(default=True)),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=models.CASCADE,
                        related_name="notification_preferences",
                        to="auth.user",
                    ),
                ),
            ],
        ),
        migrations.AlterUniqueTogether(
            name="notificationpreference",
            unique_together={("user", "event_type")},
        ),
        migrations.AddIndex(
            model_name="notificationpreference",
            index=models.Index(fields=["user", "event_type"], name="notificatio_user_id_pref_idx"),
        ),
    ]
