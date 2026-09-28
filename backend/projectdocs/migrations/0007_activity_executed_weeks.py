from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("projectdocs", "0006_plan_activity_source"),
    ]

    operations = [
        migrations.AddField(
            model_name="stageactivity",
            name="executed_weeks",
            field=models.JSONField(blank=True, default=list),
        ),
    ]
