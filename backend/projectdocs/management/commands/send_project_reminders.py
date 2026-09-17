"""
تذكيرات يومية لملفات المشاريع.
تشغيل عبر Cron: python manage.py send_project_reminders
التعقيد: O(A + D) للأنشطة والملفات.
"""
from __future__ import annotations

from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from projectdocs.emails import send_reminder_email
from projectdocs.models import ProjectDossier, StageActivity
from projectdocs.services import refresh_activity_auto_status


class Command(BaseCommand):
    help = "إرسال تذكيرات ملفات المشاريع حسب الحالة والتوقيت"

    def handle(self, *args, **options):
        today = timezone.localdate()
        sent = 0

        for act in StageActivity.objects.select_related("stage__dossier").iterator(chunk_size=200):
            refresh_activity_auto_status(act)

        due = StageActivity.objects.filter(
            auto_status__in=["in_progress", "delayed"],
            stage__dossier__status__in=["in_progress", "pending_approval"],
        ).select_related("stage__dossier", "stage__dossier__manager")

        by_dossier: dict[int, list] = {}
        for act in due:
            by_dossier.setdefault(act.stage.dossier_id, []).append(act)

        for acts in by_dossier.values():
            d = acts[0].stage.dossier
            to = d.manager_email or (d.manager.email if d.manager_id else "")
            delayed_n = sum(1 for a in acts if a.auto_status == "delayed")
            subject = f"تذكير يومي — أنشطة مشروع {d.code}"
            lines = [f"- {a.code}: {a.title} ({a.auto_status})" for a in acts[:20]]
            extra = f" منها {delayed_n} متعثراً" if delayed_n else ""
            body = (
                f"مرحباً،\nلديك {len(acts)} نشاطاً نشطاً في {d.code}{extra}:\n"
                + "\n".join(lines)
                + "\n\nواصل الإنجاز — كل خطوة تقرب الأثر."
            )
            if send_reminder_email(to=to, subject=subject, body=body):
                sent += 1

        if today.isoweekday() == 7:
            for d in ProjectDossier.objects.filter(
                status__in=["in_progress", "pending_approval"]
            ).exclude(sponsor_email=""):
                delayed = StageActivity.objects.filter(
                    stage__dossier=d, auto_status="delayed"
                ).count()
                subject = f"تقرير أسبوعي — {d.code}"
                body = (
                    f"السلام عليكم {d.sponsor_name},\n"
                    f"حالة المشروع: {d.status} — المرحلة الحالية: {d.current_stage}\n"
                    f"أنشطة متعثرة: {delayed}\n"
                    f"شكراً لرعايتكم للمشروع."
                )
                if send_reminder_email(to=d.sponsor_email, subject=subject, body=body):
                    sent += 1

        month_ahead = today + timedelta(days=30)
        for d in ProjectDossier.objects.filter(
            stages__key="define", stages__planned_start=month_ahead
        ).distinct():
            to = d.manager_email or d.sponsor_email
            if send_reminder_email(
                to=to,
                subject=f"تبقّى شهر على بدء {d.code}",
                body=f"تبقّى شهر على التاريخ المخطط لبدء المشروع {d.code}. حان وقت استكمال التجهيز.",
            ):
                sent += 1

        week_ahead = today + timedelta(days=7)
        for d in ProjectDossier.objects.filter(
            stages__key="define", stages__planned_start=week_ahead
        ).distinct():
            empty_docs = d.sections.filter(kind="document", status="empty").count()
            if empty_docs:
                to = d.sponsor_email or d.manager_email
                office = d.projects_office_name or "—"
                if send_reminder_email(
                    to=to,
                    subject=f"وثيقة غير مكتملة — {d.code}",
                    body=(
                        f"تبقّى أسبوع على البدء المخطط وعدد الأقسام الفارغة في الوثيقة: {empty_docs}.\n"
                        f"مكتب المشاريع: {office}\nيرجى استكمال التعبئة قبل الإطلاق."
                    ),
                ):
                    sent += 1

        self.stdout.write(self.style.SUCCESS(f"أُرسل {sent} تذكيراً"))
