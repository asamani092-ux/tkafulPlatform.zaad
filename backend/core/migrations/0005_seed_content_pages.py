from django.db import migrations


CONTENT_PAGES = [
    {
        "slug": "home",
        "title": "تكافل وأثر",
        "body": "منصّة واحدة للعمل الخيري والتطوعي — مشاريع، كفالات، خارطة أثر، وخدمات مجتمعية.",
    },
    {
        "slug": "about-mission",
        "title": "رسالتنا",
        "body": "ربط المحتاجين بالمتبرعين والمتطوعين لصنع أثر مستدام في المجتمع.",
    },
    {
        "slug": "about-values",
        "title": "قيمنا",
        "body": "العطاء، الشفافية، والتكافل المجتمعي في كل مبادرة نقوم بها.",
    },
    {
        "slug": "about-community",
        "title": "مجتمعنا",
        "body": "شبكة من المتطوعين والمتبرعين والمستفيدين تعمل يدًا بيد.",
    },
]


def forwards(apps, schema_editor):
    StaticPage = apps.get_model("core", "StaticPage")
    for page in CONTENT_PAGES:
        StaticPage.objects.get_or_create(
            slug=page["slug"],
            defaults={
                "title": page["title"],
                "body": page["body"],
                "is_published": True,
            },
        )


def backwards(apps, schema_editor):
    StaticPage = apps.get_model("core", "StaticPage")
    StaticPage.objects.filter(slug__in=[p["slug"] for p in CONTENT_PAGES]).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("core", "0004_seed_zaad_config_defaults"),
    ]

    operations = [
        migrations.RunPython(forwards, backwards),
    ]
