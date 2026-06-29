"""
محوّل بذور اللوحة التنفيذية من المشروع الثاني (GAS).

يُعيد إنتاج سلوك دالة setupDashboardSheets في Google Apps Script:
ينشئ البيانات الافتراضية للأقسام والموظفين والمهام و KPIs.

idempotent: يستخدم update_or_create على (external_source='gas', external_id)
بحيث لا يُكرّر الصفوف عند إعادة التشغيل (مبدأ الإضافة التراكمية، لا الاستبدال).

التعقيد: زمن O(n) و مكان O(1) لكل صف، حيث n عدد صفوف البذور الثابتة.
"""
from decimal import Decimal
from django.core.management.base import BaseCommand
from django.db import transaction

from analytics.models import Employee, DashboardSection, DashboardKpi, StaffTask

SOURCE = "gas"

# نفس قيم setupDashboardSheets (مع إقصاء الألوان/الإيموجي — التصميم من design-system)
SECTIONS = [
    # title, unit, total, actual, expected, closed, in_progress, near, late, review, not_started
    ("قسم التكافل المجتمعي", "نشاطًا", 76, "38.2", "38.2", 29, 8, 6, 0, 0, 33),
    ("قسم التكافل المجتمعي", "مبادرة", 45, "72", "100", 18, 5, 2, 0, 0, 0),
    ("الأفكار التطويرية", "فكرة", 32, "50", "100", 10, 7, 5, 1, 2, 7),
]

EMPLOYEES = [
    # name, role, completed, progress
    ("مشاري السليمي", "مدير الإدارة", 15, 90),
    ("عمر الوطبان", "مشرف مشاريع", 12, 85),
    ("مالك المطلق", "أخصائي مشاريع", 10, 75),
    ("فاطمة الفهاد", "أخصائية تطوع", 8, 70),
    ("ريان التويجري", "متابعة المستفيدين", 7, 65),
]

TASKS = [
    # title, owner_name, initiative, completed_date, progress
    ("تحديث خطة توزيع الأضاحي", "مشاري السليمي", "أضحيتي زاد وإسعاد", "2026-05-18", 100),
    ("إغلاق تقرير الإفطار السيار", "عمر الوطبان", "الإفطار السيار", "2026-04-16", 100),
    ("توثيق مخرجات زكاة الفطر", "مالك المطلق", "زكاة الفطر", "2026-04-02", 100),
    ("اعتماد تقارير المتطوعين", "فاطمة الفهاد", "التطوع", "2026-04-01", 100),
    ("تحديث بيانات الأسر المستفيدة", "ريان التويجري", "سقيا المساجد", "2026-03-31", 100),
]

KPIS = [
    # title, value, subtitle
    ("المتطوعون", "268", "متطوعًا نشطًا"),
    ("المستفيدون", "4,856", "مستفيدًا"),
    ("إجمالي المبادرات", "121", "مبادرة"),
    ("نسبة الإنجاز الكلية", "68%", "من المستهدف"),
    ("القيمة الإجمالية", "2.4M", "ريال"),
]


class Command(BaseCommand):
    help = "بذر اللوحة التنفيذية بالبيانات الافتراضية من المشروع الثاني (GAS) — idempotent"

    @transaction.atomic
    def handle(self, *args, **options):
        emp_by_name = {}

        for i, (name, role, completed, progress) in enumerate(EMPLOYEES):
            emp, _ = Employee.objects.update_or_create(
                external_source=SOURCE, external_id=f"emp-{i}",
                defaults={
                    "name": name, "role": role,
                    "completed_tasks": completed, "progress": progress,
                    "is_active": True,
                },
            )
            emp_by_name[name] = emp
        self.stdout.write(self.style.SUCCESS(f"Employees: {len(EMPLOYEES)} upserted"))

        for i, sec in enumerate(SECTIONS):
            title, unit, total, actual, expected, closed, in_prog, near, late, review, not_started = sec
            DashboardSection.objects.update_or_create(
                external_source=SOURCE, external_id=f"sec-{i}",
                defaults={
                    "title": title, "unit": unit, "total": total,
                    "actual": Decimal(actual), "expected": Decimal(expected),
                    "closed": closed, "in_progress": in_prog, "near": near,
                    "late": late, "review": review, "not_started": not_started,
                    "display_order": i,
                },
            )
        self.stdout.write(self.style.SUCCESS(f"Sections: {len(SECTIONS)} upserted"))

        for i, (title, owner, initiative, date, progress) in enumerate(TASKS):
            StaffTask.objects.update_or_create(
                external_source=SOURCE, external_id=f"task-{i}",
                defaults={
                    "title": title, "employee": emp_by_name.get(owner),
                    "initiative": initiative, "completed_date": date, "progress": progress,
                },
            )
        self.stdout.write(self.style.SUCCESS(f"Staff tasks: {len(TASKS)} upserted"))

        for i, (title, value, subtitle) in enumerate(KPIS):
            DashboardKpi.objects.update_or_create(
                external_source=SOURCE, external_id=f"kpi-{i}",
                defaults={"title": title, "value": value, "subtitle": subtitle, "display_order": i},
            )
        self.stdout.write(self.style.SUCCESS(f"KPIs: {len(KPIS)} upserted"))

        self.stdout.write(self.style.SUCCESS("Executive dashboard seeded successfully (GAS defaults)."))
