# Fix SQLite FK: stafftask.project must reference projects_project not dropped takaful_app_project

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("analytics", "0004_stafftask_project_to_platform"),
        ("projects", "0003_donation_links"),
    ]

    operations = [
        migrations.AlterField(
            model_name="stafftask",
            name="project",
            field=models.ForeignKey(
                blank=True, null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="staff_tasks", to="projects.project",
            ),
        ),
    ]
