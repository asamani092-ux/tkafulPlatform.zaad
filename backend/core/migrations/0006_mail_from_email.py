from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0005_seed_content_pages"),
    ]

    operations = [
        migrations.AddField(
            model_name="platformsetting",
            name="mail_from_email",
            field=models.EmailField(
                blank=True,
                default="",
                help_text="بريد المرسل (From) — يجب أن يطابق حساب SMTP أو يملك صلاحية الإرسال باسمه",
                max_length=254,
            ),
        ),
    ]
