# Phase A3 step 2b: repoint FK values + drop staging columns (D-25)

import django.db.models.deletion
from django.db import migrations, models


def copy_platform_fk_values(apps, schema_editor):
    """Copy platform_project_id into project_id, then staging column is removed."""
    for model_name in ("Task", "ProjectAssignment", "VolunteerApplication"):
        Model = apps.get_model("volunteering", model_name)
        table = Model._meta.db_table
        with schema_editor.connection.cursor() as cursor:
            cursor.execute(
                f"UPDATE {table} SET project_id = platform_project_id "
                f"WHERE platform_project_id IS NOT NULL"
            )


def reverse_copy_platform_fk_values(apps, schema_editor):
    for model_name in ("Task", "ProjectAssignment", "VolunteerApplication"):
        Model = apps.get_model("volunteering", model_name)
        table = Model._meta.db_table
        with schema_editor.connection.cursor() as cursor:
            cursor.execute(
                f"UPDATE {table} SET platform_project_id = project_id "
                f"WHERE project_id IS NOT NULL"
            )


class Migration(migrations.Migration):

    dependencies = [
        ("analytics", "0004_stafftask_project_to_platform"),
        ("volunteering", "0003_migrate_projects_data"),
    ]

    operations = [
        migrations.RunPython(copy_platform_fk_values, reverse_copy_platform_fk_values),
        migrations.RemoveField(model_name="task", name="platform_project"),
        migrations.AlterField(
            model_name="task",
            name="project",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name="tasks", to="projects.project",
            ),
        ),
        migrations.RemoveField(model_name="projectassignment", name="platform_project"),
        migrations.AlterField(
            model_name="projectassignment",
            name="project",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name="assignments", to="projects.project",
            ),
        ),
        migrations.RemoveField(model_name="volunteerapplication", name="platform_project"),
        migrations.AlterField(
            model_name="volunteerapplication",
            name="project",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name="applications", to="projects.project",
            ),
        ),
        migrations.DeleteModel(name="Project"),
    ]
