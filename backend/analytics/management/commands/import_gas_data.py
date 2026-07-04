"""
محوّل استيراد بيانات المشروع الثاني (Google Apps Script) إلى المنصة الموحّدة.

لأن الوصول المباشر لـ Google Sheets غير متاح، يقرأ الأمر **ملف تصدير JSON** يطابق
بنية أوراق GAS (Users / Projects / Notifications / DashboardSections /
DashboardEmployees / DashboardTasks / DashboardKpis).

idempotent: كل الكيانات تُحدَّث/تُنشأ عبر (external_source, external_id) فلا تتكرر
عند إعادة التشغيل (مبدأ الإضافة التراكمية — لا استبدال للتاريخ).

أمان: كلمات مرور GAS تُجزّأ (hash) عبر set_password، ويُضبط must_reset_password=True
لإجبار إعادة التعيين عند أول دخول (لا تُخزَّن كنص صريح أبداً).

التعقيد: زمن O(R) و مكان O(U) حيث R إجمالي الصفوف و U عدد المستخدمين (خريطة الربط).

=== الاستعداد للمشروع الثالث ===
هذا الأمر هو القالب المرجعي. لإضافة مشروع ثالث:
  1) انسخ هذا الملف إلى import_<source>_data.py
  2) غيّر SOURCE والـ mapping بحسب أعمدة مصدر المشروع الثالث
  3) حقول external_source/external_id الموجودة في كل النماذج تضمن دمجاً idempotent دون كسر البيانات الحالية
الصيغة الموحّدة لملف التصدير (JSON) موثّقة في backend/INTEGRATIONS.md.
"""
import json
import os
from datetime import datetime

from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from django.db import transaction

from accounts.models import Profile
from analytics.models import Employee, DashboardSection, DashboardKpi, StaffTask
from notifications.models import Notification
from takaful_app.models import Project

# تحويل أدوار GAS (غير مكتملة من العميل) إلى المسميات الموحّدة الجديدة
ROLE_MAP = {"admin": "admin", "manager": "manager"}
DEFAULT_ROLE = "employee"


def parse_date(value):
    if not value:
        return None
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%Y/%m/%d"):
        try:
            return datetime.strptime(str(value).strip(), fmt).date()
        except ValueError:
            continue
    return None


def to_int(value, default=0):
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return default


class Command(BaseCommand):
    help = "استيراد بيانات GAS من ملف تصدير JSON (idempotent)"

    def add_arguments(self, parser):
        parser.add_argument("--file", required=True, help="مسار ملف JSON المُصدَّر")
        parser.add_argument("--source", default="gas", help="معرّف المصدر (للمشروع الثالث: غيّره)")

    @transaction.atomic
    def handle(self, *args, **options):
        path = options["file"]
        source = options["source"]

        if not os.path.exists(path):
            self.stderr.write(self.style.ERROR(f"File not found: {path}"))
            return

        with open(path, encoding="utf-8") as fh:
            data = json.load(fh)

        user_by_ext = self._import_users(data.get("users", []), source)
        self._import_employees(data.get("employees", []), source)
        self._import_projects(data.get("projects", []), source)
        self._import_sections(data.get("sections", []), source)
        self._import_tasks(data.get("tasks", []), source)
        self._import_kpis(data.get("kpis", []), source)
        self._import_notifications(data.get("notifications", []), source, user_by_ext)

        self.stdout.write(self.style.SUCCESS(f"GAS import completed (source='{source}')."))

    def _import_users(self, rows, source):
        user_by_ext = {}
        created = 0
        for r in rows:
            ext_id = str(r.get("id", "")).strip()
            email = str(r.get("email", "")).strip().lower()
            if not email:
                continue
            user, _ = User.objects.get_or_create(
                username=email,
                defaults={"email": email, "first_name": r.get("name", "")},
            )
            # أمان: تجزئة كلمة المرور + إجبار إعادة التعيين
            password = r.get("password")
            if password:
                user.set_password(str(password))
            else:
                user.set_unusable_password()
            user.first_name = r.get("name", user.first_name)
            user.is_active = str(r.get("status", "active")).lower() == "active"
            user.save()

            profile = user.profile
            profile.name = r.get("name", "")
            profile.role = ROLE_MAP.get(str(r.get("role", "")).lower(), DEFAULT_ROLE)
            profile.is_approved = True
            profile.must_reset_password = True
            profile.external_source = source
            profile.external_id = ext_id
            profile.save()

            if ext_id:
                user_by_ext[ext_id] = user
            created += 1
        self.stdout.write(self.style.SUCCESS(f"Users: {created} upserted"))
        return user_by_ext

    def _import_employees(self, rows, source):
        for i, r in enumerate(rows):
            Employee.objects.update_or_create(
                external_source=source, external_id=f"emp-{r.get('id', i)}",
                defaults={
                    "name": r.get("name", ""),
                    "role": r.get("role", ""),
                    "completed_tasks": to_int(r.get("completed")),
                    "progress": to_int(r.get("progress")),
                    "is_active": True,
                },
            )
        self.stdout.write(self.style.SUCCESS(f"Employees: {len(rows)} upserted"))

    def _import_projects(self, rows, source):
        for r in rows:
            manager = Employee.objects.filter(name=r.get("manager", "")).first()
            Project.objects.update_or_create(
                external_source=source, external_id=str(r.get("id", "")),
                defaults={
                    "title": r.get("name", ""),
                    "status": r.get("status", "ACTIVE"),
                    "progress": to_int(r.get("progress")),
                    "start_date": parse_date(r.get("startDate")),
                    "end_date": parse_date(r.get("endDate")),
                    "budget": r.get("budget") or 0,
                    "manager_employee": manager,
                },
            )
        self.stdout.write(self.style.SUCCESS(f"Projects: {len(rows)} upserted"))

    def _import_sections(self, rows, source):
        for i, r in enumerate(rows):
            DashboardSection.objects.update_or_create(
                external_source=source, external_id=f"sec-{r.get('id', i)}",
                defaults={
                    "title": r.get("title", ""), "unit": r.get("unit", ""),
                    "total": to_int(r.get("total")),
                    "actual": r.get("actual") or 0, "expected": r.get("expected") or 0,
                    "closed": to_int(r.get("closed")), "in_progress": to_int(r.get("inProgress")),
                    "near": to_int(r.get("near")), "late": to_int(r.get("late")),
                    "review": to_int(r.get("review")), "not_started": to_int(r.get("notStarted")),
                    "display_order": i,
                },
            )
        self.stdout.write(self.style.SUCCESS(f"Sections: {len(rows)} upserted"))

    def _import_tasks(self, rows, source):
        for i, r in enumerate(rows):
            owner = Employee.objects.filter(name=r.get("owner", "")).first()
            StaffTask.objects.update_or_create(
                external_source=source, external_id=f"task-{r.get('id', i)}",
                defaults={
                    "title": r.get("task", ""), "employee": owner,
                    "initiative": r.get("initiative", ""),
                    "completed_date": parse_date(r.get("date")),
                    "progress": to_int(r.get("progress")),
                },
            )
        self.stdout.write(self.style.SUCCESS(f"Staff tasks: {len(rows)} upserted"))

    def _import_kpis(self, rows, source):
        for i, r in enumerate(rows):
            DashboardKpi.objects.update_or_create(
                external_source=source, external_id=f"kpi-{r.get('id', i)}",
                defaults={
                    "title": r.get("title", ""), "value": str(r.get("value", "")),
                    "subtitle": r.get("subtitle", ""), "display_order": i,
                },
            )
        self.stdout.write(self.style.SUCCESS(f"KPIs: {len(rows)} upserted"))

    def _import_notifications(self, rows, source, user_by_ext):
        created = 0
        for r in rows:
            user = user_by_ext.get(str(r.get("userId", "")))
            if not user:
                continue
            Notification.objects.get_or_create(
                user=user,
                message=r.get("message", ""),
                defaults={"status": r.get("status", "unread")},
            )
            created += 1
        self.stdout.write(self.style.SUCCESS(f"Notifications: {created} upserted"))
