"""
هجرة بيانات (قابلة للعكس): ربط كل الكفالات بمشروع «كفالات السقيا».
الأمامي: UPDATE واحد O(N) صفوف. العكسي: إعادة الحقل إلى NULL (لا حذف بيانات).
"""
from django.db import migrations


def link_to_saqya_project(apps, schema_editor):
    Project = apps.get_model("projects", "Project")
    Sponsorship = apps.get_model("sponsorships", "Sponsorship")
    project = Project.objects.filter(slug="saqya").first()
    if project is None:
        return
    Sponsorship.objects.filter(project__isnull=True).update(project=project)


def unlink_from_saqya_project(apps, schema_editor):
    Project = apps.get_model("projects", "Project")
    Sponsorship = apps.get_model("sponsorships", "Sponsorship")
    project = Project.objects.filter(slug="saqya").first()
    if project is None:
        return
    Sponsorship.objects.filter(project=project).update(project=None)


class Migration(migrations.Migration):

    dependencies = [
        ("sponsorships", "0002_sponsorship_project"),
        ("projects", "0002_seed_projects"),
    ]

    operations = [
        migrations.RunPython(link_to_saqya_project, unlink_from_saqya_project),
    ]
