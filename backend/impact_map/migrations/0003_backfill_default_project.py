from django.db import migrations


def create_default_project(apps, schema_editor):
    """
    إنشاء مشروع «تفقدهم» الافتراضي وربط كل صفوف impact_map القائمة به (تعميم غير هدّام).
    """
    MapProject = apps.get_model("impact_map", "MapProject")
    project, _ = MapProject.objects.get_or_create(
        slug="tafaqadhum",
        defaults={
            "name": "تفقدهم",
            "source_type": "native",
            "icon_key": "MapPin",
            "color": "#8B1538",
            "is_active": True,
            "order": 0,
        },
    )
    for model_name in ["Region", "Product", "Outlet", "Contribution", "DistributionRecord"]:
        Model = apps.get_model("impact_map", model_name)
        Model.objects.filter(project__isnull=True).update(project=project)


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):
    dependencies = [
        ("impact_map", "0002_mapproject_contribution_project_and_more"),
    ]
    operations = [
        migrations.RunPython(create_default_project, noop),
    ]
