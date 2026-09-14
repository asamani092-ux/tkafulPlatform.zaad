"""
هجرة بيانات (قابلة للعكس): نسخ بيانات impact_map إلى نظام الخرائط الجديد
تحت مشروع «تفقدهم» (DECISIONS.md D-03/D-04/D-16).

الأمامي يفوّض إلى maps.sync.sync_impact_map_to_maps — نفس المنطق الوحيد
المشترك مع الأمر الإداري `sync_impact_map_to_maps` (idempotent، جداول
المصدر لا تُلمس). على قاعدة جديدة تُبذر بعد الهجرة، يعيد الأمر/البذر
المزامنة تلقائياً (سيناريو المطوّر الافتراضي).

العكسي: حذف خريطة «تفقدهم» المنسوخة فقط (cascade) — المصدر سليم في الاتجاهين.
التعقيد: O(R+P+O+C) زمنياً، O(P) مكانياً.
"""
from django.db import migrations

from maps.migrations._impact_map_sync import MAP_TITLE, PROJECT_SLUG, sync_impact_map_to_maps


def forward(apps, schema_editor):
    sync_impact_map_to_maps(apps=apps)


def backward(apps, schema_editor):
    Project = apps.get_model("projects", "Project")
    Map = apps.get_model("maps", "Map")
    project = Project.objects.filter(slug=PROJECT_SLUG).first()
    if project is None:
        return
    # حذف المنسوخ فقط — المصدر impact_map لم يُمس
    Map.objects.filter(project=project, title=MAP_TITLE).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("maps", "0001_initial"),
        ("projects", "0002_seed_projects"),
        ("impact_map", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(forward, backward),
    ]
