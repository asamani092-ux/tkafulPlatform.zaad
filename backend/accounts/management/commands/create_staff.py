"""
إنشاء حساب موظف إدارة (دور employee) له دخول للنظام الموحّد.

يُنشئ أيضاً سجل Employee مرتبط في لوحة analytics (إن لم يكن موجوداً)، ويضبط
must_reset_password=True ليُجبر الموظف على تعيين كلمة مرور جديدة عند أول دخول.

أمثلة:
  python manage.py create_staff --email omar@zaad.org --name "عمر الوطبان" --role "مشرف مشاريع" --password Temp12345!
"""
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from accounts.models import Profile
from analytics.models import Employee


class Command(BaseCommand):
    help = "إنشاء حساب موظف (دور employee) بدخول + سجل Employee مرتبط"

    def add_arguments(self, parser):
        parser.add_argument("--email", required=True)
        parser.add_argument("--name", required=True)
        parser.add_argument("--role", default="", help="المسمى التشغيلي")
        parser.add_argument("--password", required=True)

    def handle(self, *args, **options):
        email = options["email"].strip().lower()
        name = options["name"].strip()
        role_title = options["role"].strip()
        password = options["password"]

        if User.objects.filter(username=email).exists():
            self.stdout.write(self.style.WARNING(f'Staff user "{email}" already exists'))
            return

        user = User.objects.create_user(username=email, email=email, password=password)
        user.first_name = name
        user.save()

        # الـ Profile يُنشأ تلقائياً عبر signal؛ نضبط الدور وإجبار إعادة التعيين
        profile = user.profile
        profile.name = name
        profile.role = "employee"
        profile.is_approved = True
        profile.must_reset_password = True
        profile.save()

        Employee.objects.get_or_create(
            user=user,
            defaults={"name": name, "role": role_title, "is_active": True},
        )

        self.stdout.write(self.style.SUCCESS(f'Created staff user "{email}" (role=employee)'))
        self.stdout.write(self.style.SUCCESS("must_reset_password=True — سيُطلب تغيير كلمة المرور عند أول دخول"))
