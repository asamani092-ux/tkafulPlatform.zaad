# Generated manually — توافق أدوار المنصّة: manager → employee

from django.db import migrations


def forwards(apps, schema_editor):
    Profile = apps.get_model("accounts", "Profile")
    # إضافة تراكمية: نقل المدير القديم إلى موظف دون حذف السجلات
    Profile.objects.filter(role="manager").update(role="employee")


def backwards(apps, schema_editor):
    # لا نعيد المدير تلقائياً — التوافق أحادي الاتجاه
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0007_opportunity_otp"),
    ]

    operations = [
        migrations.RunPython(forwards, backwards),
    ]
