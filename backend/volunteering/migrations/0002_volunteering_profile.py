# Phase A3 step 1: VolunteeringProfile + staging FKs (D-25)

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("analytics", "0002_alter_stafftask_project"),
        ("projects", "0002_seed_projects"),
        ("volunteering", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="VolunteeringProfile",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("category", models.CharField(blank=True, max_length=50)),
                ("target_audience", models.CharField(blank=True, max_length=200)),
                ("beneficiaries", models.IntegerField(default=0)),
                ("location", models.CharField(blank=True, max_length=200)),
                ("donation_amount", models.DecimalField(decimal_places=2, default=0, max_digits=10)),
                ("implementation_requirements", models.TextField(blank=True)),
                ("project_goals", models.TextField(blank=True)),
                ("estimated_hours", models.IntegerField(default=0)),
                ("supervisor", models.CharField(blank=True, max_length=200)),
                ("duration", models.CharField(blank=True, max_length=100)),
                ("tags", models.JSONField(blank=True, default=list)),
                ("progress", models.IntegerField(default=0)),
                ("organization", models.CharField(blank=True, max_length=200)),
                ("hours", models.CharField(blank=True, max_length=50)),
                ("is_hidden", models.BooleanField(default=False)),
                ("budget", models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ("external_source", models.CharField(blank=True, max_length=50)),
                ("external_id", models.CharField(blank=True, max_length=100)),
                ("volunteer_status", models.CharField(
                    choices=[("PLANNED", "Planned"), ("ACTIVE", "Active"),
                             ("COMPLETED", "Completed"), ("CANCELLED", "Cancelled")],
                    default="PLANNED", max_length=20,
                )),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("manager_employee", models.ForeignKey(
                    blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL,
                    related_name="managed_volunteering_profiles", to="analytics.employee",
                )),
                ("project", models.OneToOneField(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="volunteering_profile", to="projects.project",
                )),
            ],
            options={"db_table": "volunteering_profile", "ordering": ["-created_at"]},
        ),
        migrations.AddField(
            model_name="task",
            name="platform_project",
            field=models.ForeignKey(
                null=True, on_delete=django.db.models.deletion.CASCADE,
                related_name="+", to="projects.project",
            ),
        ),
        migrations.AddField(
            model_name="projectassignment",
            name="platform_project",
            field=models.ForeignKey(
                null=True, on_delete=django.db.models.deletion.CASCADE,
                related_name="+", to="projects.project",
            ),
        ),
        migrations.AddField(
            model_name="volunteerapplication",
            name="platform_project",
            field=models.ForeignKey(
                null=True, on_delete=django.db.models.deletion.CASCADE,
                related_name="+", to="projects.project",
            ),
        ),
    ]
