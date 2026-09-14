from django.db import migrations, models


def seed(apps, schema_editor):
    PlatformSetting = apps.get_model("core", "PlatformSetting")
    StaticPage = apps.get_model("core", "StaticPage")
    PlatformSetting.objects.get_or_create(
        pk=1,
        defaults={
            "platform_name": "تكافل وأثر",
            "contact_email": "info@takafol-athar.com",
            "contact_phone": "+966 50 123 4567",
            "address": "القصيم، المملكة العربية السعودية",
            "social_links": {},
            "show_map": True,
            "show_services": True,
            "show_volunteering": True,
        },
    )
    StaticPage.objects.get_or_create(
        slug="about",
        defaults={
            "title": "من نحن",
            "body": "منصة تكافل وأثر تربط المحتاجين بالمتبرعين والمتطوعين لصنع أثر إيجابي في المجتمع.",
            "is_published": True,
        },
    )
    StaticPage.objects.get_or_create(
        slug="terms",
        defaults={
            "title": "الشروط",
            "body": "شروط استخدام منصة تكافل وأثر.",
            "is_published": False,
        },
    )


class Migration(migrations.Migration):
    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="PlatformSetting",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("platform_name", models.CharField(default="تكافل وأثر", max_length=150)),
                ("logo_url", models.URLField(blank=True)),
                ("contact_email", models.EmailField(blank=True, default="info@takafol-athar.com", max_length=254)),
                ("contact_phone", models.CharField(blank=True, default="+966 50 123 4567", max_length=40)),
                ("address", models.CharField(blank=True, default="القصيم، المملكة العربية السعودية", max_length=255)),
                ("social_links", models.JSONField(blank=True, default=dict)),
                ("show_map", models.BooleanField(default=True)),
                ("show_services", models.BooleanField(default=True)),
                ("show_volunteering", models.BooleanField(default=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={"verbose_name": "إعدادات المنصّة"},
        ),
        migrations.CreateModel(
            name="StaticPage",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("slug", models.SlugField(max_length=80, unique=True)),
                ("title", models.CharField(max_length=200)),
                ("body", models.TextField(blank=True)),
                ("is_published", models.BooleanField(default=False)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={"ordering": ["slug"]},
        ),
        migrations.RunPython(seed, migrations.RunPython.noop),
    ]
