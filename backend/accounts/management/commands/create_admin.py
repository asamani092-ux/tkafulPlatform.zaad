from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from accounts.models import Profile
import os


class Command(BaseCommand):
    help = 'Create admin user if it does not exist'

    def handle(self, *args, **options):
        # Get credentials from environment variables or use defaults
        username = os.environ.get('ADMIN_USERNAME', 'admin')
        email = os.environ.get('ADMIN_EMAIL', 'admin@takaful.com')
        password = os.environ.get('ADMIN_PASSWORD', 'admin123')

        # Check if admin user already exists
        if User.objects.filter(username=username).exists():
            self.stdout.write(self.style.WARNING(f'Admin user "{username}" already exists'))
            return

        # Create superuser
        user = User.objects.create_superuser(
            username=username,
            email=email,
            password=password
        )

        # Create profile
        profile, created = Profile.objects.get_or_create(user=user)
        profile.name = 'المسؤول'
        profile.role = 'admin'
        profile.is_approved = True
        profile.save()

        self.stdout.write(self.style.SUCCESS(f'Successfully created admin user "{username}"'))
        self.stdout.write(self.style.SUCCESS(f'Email: {email}'))
        self.stdout.write(self.style.SUCCESS('You can change the password after first login'))
