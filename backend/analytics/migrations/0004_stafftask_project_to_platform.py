# Phase A3: repoint StaffTask.project → projects.Project

import django.db.models.deletion
from django.db import migrations, models


def copy_stafftask_fk(apps, schema_editor):
    StaffTask = apps.get_model("analytics", "StaffTask")
    table = StaffTask._meta.db_table
    with schema_editor.connection.cursor() as cursor:
        cursor.execute(
            f"UPDATE {table} SET project_id = platform_project_id "
            f"WHERE platform_project_id IS NOT NULL"
        )


def reverse_stafftask_fk(apps, schema_editor):
    StaffTask = apps.get_model("analytics", "StaffTask")
    table = StaffTask._meta.db_table
    with schema_editor.connection.cursor() as cursor:
        cursor.execute(
            f"UPDATE {table} SET platform_project_id = project_id "
            f"WHERE project_id IS NOT NULL"
        )


class Migration(migrations.Migration):

    dependencies = [
        ("analytics", "0003_stafftask_platform_project"),
        ("volunteering", "0003_migrate_projects_data"),
    ]

    operations = [
        migrations.RunPython(copy_stafftask_fk, reverse_stafftask_fk),
        migrations.RemoveField(model_name="stafftask", name="platform_project"),
        migrations.SeparateDatabaseAndState(
            database_operations=[],
            state_operations=[
                migrations.AlterField(
                    model_name="stafftask",
                    name="project",
                    field=models.ForeignKey(
                        blank=True, null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="staff_tasks", to="projects.project",
                    ),
                ),
            ],
        ),
    ]
