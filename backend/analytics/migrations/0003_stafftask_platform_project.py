# Phase A3: StaffTask staging FK to projects.Project

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("analytics", "0002_alter_stafftask_project"),
        ("projects", "0002_seed_projects"),
        ("volunteering", "0002_volunteering_profile"),
    ]

    operations = [
        migrations.AddField(
            model_name="stafftask",
            name="platform_project",
            field=models.ForeignKey(
                blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL,
                related_name="+", to="projects.project",
            ),
        ),
    ]
