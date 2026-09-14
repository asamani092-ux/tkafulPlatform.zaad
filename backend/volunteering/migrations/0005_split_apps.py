# Phase A4: state-only removal of models moved to services/reporting (D-26)

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("reporting", "0001_split_apps"),
        ("services", "0001_split_apps"),
        ("volunteering", "0004_swap_project_fks"),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[],
            state_operations=[
                migrations.RemoveField(model_name="adminreport", name="admin"),
                migrations.RemoveField(model_name="departmenthours", name="statistics"),
                migrations.AlterUniqueTogether(name="quarterlytarget", unique_together=None),
                migrations.RemoveField(model_name="quarterlytarget", name="statistics"),
                migrations.RemoveField(model_name="servicerequest", name="service"),
                migrations.RemoveField(model_name="servicevolunteerapplication", name="service"),
                migrations.AlterUniqueTogether(name="servicevolunteerapplication", unique_together=None),
                migrations.RemoveField(model_name="servicevolunteerapplication", name="reviewed_by"),
                migrations.RemoveField(model_name="servicevolunteerapplication", name="volunteer"),
                migrations.DeleteModel(name="Suggestion"),
                migrations.AlterUniqueTogether(name="topvolunteer", unique_together=None),
                migrations.RemoveField(model_name="topvolunteer", name="statistics"),
                migrations.RemoveField(model_name="topvolunteer", name="user"),
                migrations.DeleteModel(name="WaterSupplyRequest"),
                migrations.DeleteModel(name="AdminReport"),
                migrations.DeleteModel(name="DepartmentHours"),
                migrations.DeleteModel(name="QuarterlyTarget"),
                migrations.DeleteModel(name="ServiceRequest"),
                migrations.DeleteModel(name="Service"),
                migrations.DeleteModel(name="ServiceVolunteerApplication"),
                migrations.DeleteModel(name="VolunteerStatistics"),
                migrations.DeleteModel(name="TopVolunteer"),
            ],
        ),
    ]
