import django.db.models.deletion
from django.db import migrations, models


STARTER_TYPES = [
    ("إغاثي", "ighathi"),
    ("موسمي", "mawsimi"),
    ("كفالات", "kafalat"),
    ("تطوّعي", "tatawwui"),
    ("توعوي", "tawawi"),
]


def seed_types(apps, schema_editor):
    ProjectType = apps.get_model("projects", "ProjectType")
    for order, (name, slug) in enumerate(STARTER_TYPES):
        ProjectType.objects.get_or_create(
            slug=slug,
            defaults={"name": name, "order": order, "is_active": True},
        )


def unseed_types(apps, schema_editor):
    # العكس النظيف هو إسقاط الجدول (CreateModel)؛ لا نحذف صفوفاً هنا لتفادي
    # فشل العكس على SQLite عند وجود FKs. RunPython.noop يجعل العكس idempotent.
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("projects", "0004_featured_home"),
    ]

    operations = [
        migrations.CreateModel(
            name="ProjectType",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=100, unique=True)),
                ("slug", models.SlugField(allow_unicode=True, max_length=100, unique=True)),
                ("is_active", models.BooleanField(default=True)),
                ("order", models.PositiveIntegerField(default=0, help_text="ترتيب العرض (الأصغر أولاً)")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
            ],
            options={"ordering": ["order", "name"]},
        ),
        migrations.AddField(
            model_name="project",
            name="type",
            field=models.ForeignKey(
                blank=True,
                help_text="نوع المشروع (اختياري، قابل للتوسّع من الإعدادات)",
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="projects",
                to="projects.projecttype",
            ),
        ),
        migrations.RunPython(seed_types, unseed_types),
    ]
