"""
هجرة بيانات (قابلة للعكس): إنشاء المشاريع الثلاثة الأساسية مع أدواتها.
- «كفالات السقيا»  slug=saqya        (أدوات: sponsorships, reports)
- «تفقدهم»          slug=tafaqqadhum  (أدوات: map, reports)
- «تكافل وأثر»      slug=takaful-athar (أدوات: volunteering, services, reports)
العكس يحذف هذه المشاريع الثلاثة فقط (بالـ slug) — O(1) صفوف.
"""
from django.db import migrations

SEED = [
    {
        "name": "كفالات السقيا",
        "slug": "saqya",
        "description": "منصّة كفالات السقيا في جمعية الزاد — كفالات، طلبات توريد، توثيق ميداني.",
        "brand_color": "#8b1538",
        "tools": ["sponsorships", "reports"],
    },
    {
        "name": "تفقدهم",
        "slug": "tafaqqadhum",
        "description": "خارطة تفقدهم — شفافية توزيع المساهمات على المناطق والمنافذ.",
        "brand_color": "#f2b824",
        "tools": ["map", "reports"],
    },
    {
        "name": "تكافل وأثر",
        "slug": "takaful-athar",
        "description": "المشروع الأساسي للمنصّة — التطوع والخدمات القائمة.",
        "brand_color": "#8b1538",
        "tools": ["volunteering", "services", "reports"],
    },
]


def seed_projects(apps, schema_editor):
    Project = apps.get_model("projects", "Project")
    ProjectTool = apps.get_model("projects", "ProjectTool")
    for row in SEED:
        project, _created = Project.objects.get_or_create(
            slug=row["slug"],
            defaults={
                "name": row["name"],
                "description": row["description"],
                "brand_color": row["brand_color"],
                "status": "active",
                "is_active": True,
            },
        )
        for tool_key in row["tools"]:
            ProjectTool.objects.get_or_create(
                project=project, tool_key=tool_key, defaults={"is_enabled": True}
            )


def unseed_projects(apps, schema_editor):
    Project = apps.get_model("projects", "Project")
    Project.objects.filter(slug__in=[r["slug"] for r in SEED]).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("projects", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(seed_projects, unseed_projects),
    ]
