from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from accounts.models import Profile
import os


class Command(BaseCommand):
    help = "Create admin user if it does not exist"

    def handle(self, *args, **options):
        username = os.environ.get("ADMIN_USERNAME", "admin")
        email = os.environ.get("ADMIN_EMAIL", "admin@takaful.com")
        password = os.environ.get("ADMIN_PASSWORD", "admin123")

        if User.objects.filter(username=username).exists():
            self.stdout.write(self.style.WARNING(f'Admin user "{username}" already exists'))
            return

        if User.objects.filter(email__iexact=email).exists():
            self.stdout.write(self.style.WARNING(f'User with email "{email}" already exists'))
            return

        # إنشاء مباشر دون validate_password حتى تعمل كلمات المرور المحددة للنشر
        # (مثل الأرقام فقط)؛ يُفضَّل تغييرها بعد أول دخول.
        user = User(
            username=username,
            email=email,
            is_staff=True,
            is_superuser=True,
            is_active=True,
        )
        user.set_password(password)
        user.save()

        profile, _ = Profile.objects.get_or_create(user=user)
        profile.name = "المسؤول"
        profile.role = "admin"
        profile.is_approved = True
        profile.save()

        self.stdout.write(self.style.SUCCESS(f'Successfully created admin user "{username}"'))
        self.stdout.write(self.style.SUCCESS(f"Email: {email}"))
        self.stdout.write(self.style.SUCCESS("You can change the password after first login"))
