"""
فحص سلامة بيانات الهجرة (project-first restructure).

الاستخدام:
  # قبل الهجرة: التقاط لقطة أعداد لكل الجداول المعنية
  python manage.py check_migration_integrity --snapshot /tmp/before.json

  # بعد الهجرة الأمامية: تحقق أن المصادر لم تتغير وأن النسخ مطابق
  python manage.py check_migration_integrity --verify /tmp/before.json --expect migrated

  # بعد الهجرة العكسية: تحقق أن المصادر لم تتغير وأن المنسوخ أُزيل
  python manage.py check_migration_integrity --verify /tmp/before.json --expect reverted

يخرج برمز غير صفري عند أي اختلال (شرط الإيقاف الاضطراري في خطة إعادة الهيكلة).
التعقيد: O(T) استعلامات COUNT حيث T عدد الجداول (~30) — لا يجلب صفوفاً.
"""
import json

from django.core.management.base import BaseCommand, CommandError


def _counts():
    """أعداد الصفوف لكل الجداول المعنية بالهجرة (مصدر وهدف)."""
    from impact_map.models import (
        Contribution, DistributionRecord, Outlet, Product, Region,
    )
    from sponsorships.models import (
        Documentation, Invoice, Order, Payment, RepresentativeProfile,
        Sponsorship, SupplierProfile,
    )
    from volunteering import models as vol

    counts = {
        # ---- مصدر: impact_map (يجب ألا يتغير أبداً) ----
        "impact_map.Region": Region.objects.count(),
        "impact_map.Product": Product.objects.count(),
        "impact_map.Outlet": Outlet.objects.count(),
        "impact_map.Contribution": Contribution.objects.count(),
        "impact_map.DistributionRecord": DistributionRecord.objects.count(),
        # ---- كفالات السقيا (جداول saqya_* نفسها عبر نماذج sponsorships) ----
        "sponsorships.Sponsorship": Sponsorship.objects.count(),
        "sponsorships.Order": Order.objects.count(),
        "sponsorships.Invoice": Invoice.objects.count(),
        "sponsorships.Payment": Payment.objects.count(),
        "sponsorships.Documentation": Documentation.objects.count(),
        "sponsorships.SupplierProfile": SupplierProfile.objects.count(),
        "sponsorships.RepresentativeProfile": RepresentativeProfile.objects.count(),
        # ---- التطوع (جداول takaful_app_* نفسها عبر نماذج volunteering) ----
        "volunteering.Project": vol.Project.objects.count(),
        "volunteering.Service": vol.Service.objects.count(),
        "volunteering.ServiceRequest": vol.ServiceRequest.objects.count(),
        "volunteering.ServiceVolunteerApplication": vol.ServiceVolunteerApplication.objects.count(),
        "volunteering.Volunteer": vol.Volunteer.objects.count(),
        "volunteering.Suggestion": vol.Suggestion.objects.count(),
        "volunteering.ProjectAssignment": vol.ProjectAssignment.objects.count(),
        "volunteering.Task": vol.Task.objects.count(),
        "volunteering.Subtask": vol.Subtask.objects.count(),
        "volunteering.AdminReport": vol.AdminReport.objects.count(),
        "volunteering.VolunteerApplication": vol.VolunteerApplication.objects.count(),
        "volunteering.VolunteerStatistics": vol.VolunteerStatistics.objects.count(),
        "volunteering.QuarterlyTarget": vol.QuarterlyTarget.objects.count(),
        "volunteering.DepartmentHours": vol.DepartmentHours.objects.count(),
        "volunteering.TopVolunteer": vol.TopVolunteer.objects.count(),
        "volunteering.WaterSupplyRequest": vol.WaterSupplyRequest.objects.count(),
    }
    return counts


# الجداول التي يجب ألا تتغير أعدادها بين اللقطة وأي حالة لاحقة (مصدر الحقيقة)
INVARIANT_KEYS = [
    "impact_map.Region", "impact_map.Product", "impact_map.Outlet",
    "impact_map.Contribution", "impact_map.DistributionRecord",
    "sponsorships.Sponsorship", "sponsorships.Order", "sponsorships.Invoice",
    "sponsorships.Payment", "sponsorships.Documentation",
    "sponsorships.SupplierProfile", "sponsorships.RepresentativeProfile",
    "volunteering.Project", "volunteering.Service", "volunteering.ServiceRequest",
    "volunteering.ServiceVolunteerApplication", "volunteering.Volunteer",
    "volunteering.Suggestion", "volunteering.ProjectAssignment", "volunteering.Task",
    "volunteering.Subtask", "volunteering.AdminReport",
    "volunteering.VolunteerApplication", "volunteering.VolunteerStatistics",
    "volunteering.QuarterlyTarget", "volunteering.DepartmentHours",
    "volunteering.TopVolunteer", "volunteering.WaterSupplyRequest",
]


def _cross_checks(expect: str):
    """فحوصات مطابقة المصدر ↔ الهدف حسب الحالة المتوقعة."""
    from impact_map.models import Contribution, Outlet, Product, Region
    from maps.models import Map, MapContribution, MapItem, MapItemField
    from projects.models import Project
    from sponsorships.models import Sponsorship

    failures = []
    info = {}

    try:
        tafaqqadhum = Project.objects.filter(slug="tafaqqadhum").first()
        copied_map = (
            Map.objects.filter(project=tafaqqadhum, title="خارطة تفقدهم").first()
            if tafaqqadhum
            else None
        )
    except Exception:
        # جداول projects/maps غير موجودة (عكس كامل إلى zero) — لا منسوخ إذن
        if expect == "migrated":
            failures.append("جداول projects/maps غير موجودة رغم توقع migrated")
        return failures, info

    if expect == "migrated":
        for slug in ("saqya", "tafaqqadhum", "takaful-athar"):
            if not Project.objects.filter(slug=slug).exists():
                failures.append(f"المشروع الأساسي مفقود: {slug}")

        if copied_map is None:
            failures.append("خريطة «تفقدهم» المنسوخة غير موجودة")
        else:
            checks = [
                ("region items == impact_map.Region",
                 MapItem.objects.filter(map=copied_map, data__kind="region").count(),
                 Region.objects.count()),
                ("outlet items == impact_map.Outlet",
                 MapItem.objects.filter(map=copied_map, data__kind="outlet").count(),
                 Outlet.objects.count()),
                ("map contributions == impact_map.Contribution",
                 MapContribution.objects.filter(map=copied_map).count(),
                 Contribution.objects.count()),
                ("product options == impact_map.Product",
                 len(MapItemField.objects.filter(map=copied_map, key="product")
                     .values_list("options", flat=True).first() or []),
                 Product.objects.count()),
            ]
            for label, got, want in checks:
                info[label] = {"got": got, "want": want}
                if got != want:
                    failures.append(f"عدم تطابق: {label} (got={got}, want={want})")

        unlinked = Sponsorship.objects.filter(project__isnull=True).count()
        info["sponsorships unlinked to project"] = {"got": unlinked, "want": 0}
        if unlinked:
            failures.append(f"كفالات غير مرتبطة بمشروع: {unlinked}")

    elif expect == "reverted":
        if copied_map is not None:
            failures.append("العكس لم يحذف خريطة «تفقدهم» المنسوخة")
        try:
            linked = Sponsorship.objects.filter(project__isnull=False).count()
        except Exception:
            # العمود نفسه أُزيل بعكس AddField — حالة عكس كامل سليمة
            linked = 0
        info["sponsorships still linked after revert"] = {"got": linked, "want": 0}
        if linked:
            failures.append(f"كفالات ما زالت مرتبطة بمشروع بعد العكس: {linked}")

    return failures, info


class Command(BaseCommand):
    help = "فحص سلامة بيانات هجرة إعادة الهيكلة (أعداد قبل/بعد + مطابقة مصدر/هدف)"

    def add_arguments(self, parser):
        parser.add_argument("--snapshot", metavar="FILE", help="حفظ لقطة الأعداد إلى ملف JSON")
        parser.add_argument("--verify", metavar="FILE", help="التحقق مقابل لقطة سابقة")
        parser.add_argument(
            "--expect",
            choices=["migrated", "reverted", "none"],
            default="none",
            help="الحالة المتوقعة لفحوصات المطابقة (migrated/reverted)",
        )

    def handle(self, *args, **options):
        counts = _counts()

        if options["snapshot"]:
            with open(options["snapshot"], "w", encoding="utf-8") as f:
                json.dump(counts, f, ensure_ascii=False, indent=2)
            self.stdout.write(self.style.SUCCESS(f"Snapshot saved: {options['snapshot']}"))
            for key, value in counts.items():
                self.stdout.write(f"  {key}: {value}")
            return

        failures = []

        if options["verify"]:
            with open(options["verify"], encoding="utf-8") as f:
                before = json.load(f)
            self.stdout.write("== مقارنة أعداد المصدر (قبل → الآن) ==")
            for key in INVARIANT_KEYS:
                got = counts.get(key)
                want = before.get(key)
                mark = "OK " if got == want else "FAIL"
                self.stdout.write(f"  [{mark}] {key}: before={want} now={got}")
                if got != want:
                    failures.append(f"تغيّر عدد جدول مصدر: {key} (before={want}, now={got})")

        if options["expect"] != "none":
            cross_failures, info = _cross_checks(options["expect"])
            self.stdout.write(f"== فحوصات المطابقة (expect={options['expect']}) ==")
            for label, pair in info.items():
                mark = "OK " if pair["got"] == pair["want"] else "FAIL"
                self.stdout.write(f"  [{mark}] {label}: got={pair['got']} want={pair['want']}")
            failures.extend(cross_failures)

        if not options["verify"] and options["expect"] == "none":
            # عرض الأعداد فقط
            for key, value in counts.items():
                self.stdout.write(f"  {key}: {value}")
            return

        if failures:
            for failure in failures:
                self.stderr.write(self.style.ERROR(f"FAIL: {failure}"))
            raise CommandError(f"فشل فحص السلامة: {len(failures)} اختلال")
        self.stdout.write(self.style.SUCCESS("سلامة البيانات مؤكدة — لا اختلالات"))
