"""
يضمن بيانات عرض حيّة لمنطقة المتطوع (إحصائيات + مهام مُسندة).
آمن لإعادة التشغيل (idempotent عبر عنوان المهمة).
"""
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from projects.models import Project
from volunteering.models import Subtask, Task


class Command(BaseCommand):
    help = "Seed demo volunteer stats/tasks so /user shows live data"

    def handle(self, *args, **options):
        User = get_user_model()
        email_candidates = [
            "uat_vol@takaful.com",
            "volunteer@test.local",
            "uat_vol@takaful.com",
        ]
        vol = None
        for email in email_candidates:
            vol = User.objects.filter(email__iexact=email).first()
            if vol:
                break
        if not vol:
            vol = (
                User.objects.filter(profile__role="user", is_staff=False)
                .exclude(is_superuser=True)
                .first()
            )
        if not vol:
            self.stderr.write("No volunteer user found")
            return

        project = Project.objects.first()
        if not project:
            self.stderr.write("No project found — create a project first")
            return

        profile = vol.profile
        if not profile.name:
            profile.name = "متطوع الاختبار"
        if not profile.total_volunteer_hours:
            profile.total_volunteer_hours = 5
        if not profile.rating:
            profile.rating = 4.5
        profile.save()

        title = "مهمة تجريبية للمتطوع"
        task, created = Task.objects.get_or_create(
            title=title,
            volunteer=vol,
            defaults={
                "description": "تحقق واجهة المتطوع — إحصائيات ومهام",
                "project": project,
                "status": "قيد التنفيذ",
                "hours": 3,
                "progress": 40,
            },
        )
        if created or task.subtasks.count() == 0:
            task.subtasks.all().delete()
            Subtask.objects.create(task=task, title="خطوة ١", completed=True, order=1)
            Subtask.objects.create(task=task, title="خطوة ٢", completed=False, order=2)

        self.stdout.write(
            self.style.SUCCESS(
                f"Volunteer demo ready for {vol.email}: task=#{task.id} hours={profile.total_volunteer_hours}"
            )
        )
