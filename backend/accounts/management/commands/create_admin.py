from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from accounts.models import Profile
import os


class Command(BaseCommand):
    help = (
        "Create or update platform admin from ADMIN_USERNAME / ADMIN_EMAIL / ADMIN_PASSWORD. "
        "Idempotent: updates password/email/role if the user already exists."
    )

    def add_arguments(self, parser):
        parser.add_argument("--email", default=None, help="Override ADMIN_EMAIL")
        parser.add_argument("--username", default=None, help="Override ADMIN_USERNAME")
        parser.add_argument("--password", default=None, help="Override ADMIN_PASSWORD")

    def handle(self, *args, **options):
        username = options["username"] or os.environ.get("ADMIN_USERNAME", "admin")
        email = options["email"] or os.environ.get("ADMIN_EMAIL", "admin@takaful.com")
        password = options["password"] or os.environ.get("ADMIN_PASSWORD", "admin123")

        user = User.objects.filter(username=username).first()
        if not user:
            user = User.objects.filter(email__iexact=email).first()

        if user:
            user.username = username
            user.email = email
            user.is_staff = True
            user.is_superuser = True
            user.is_active = True
            user.set_password(password)
            user.save()
            self.stdout.write(self.style.WARNING(f'Updated admin "{username}" / {email}'))
        else:
            user = User(
                username=username,
                email=email,
                is_staff=True,
                is_superuser=True,
                is_active=True,
            )
            user.set_password(password)
            user.save()
            self.stdout.write(self.style.SUCCESS(f'Created admin "{username}" / {email}'))

        profile, _ = Profile.objects.get_or_create(user=user)
        profile.name = profile.name or "المسؤول"
        profile.role = "admin"
        profile.is_approved = True
        profile.save()

        self.stdout.write(self.style.SUCCESS("Login with email + password (no OTP on /signin)."))
