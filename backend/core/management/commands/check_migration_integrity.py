"""
فحص سلامة بيانات الهجرة (project-first restructure + Phase A1 maps).

الاستخدام:
  python manage.py check_migration_integrity --snapshot /tmp/before.json
  python manage.py check_migration_integrity --verify /tmp/before.json --expect migrated
  python manage.py check_migration_integrity --verify /tmp/before.json --expect reverted
"""
import json

from django.core.management.base import BaseCommand, CommandError

from maps.constants import MAP_TITLE, PROJECT_SLUG


def _tafaqqadhum_map():
    from maps.models import Map
    from projects.models import Project

    project = Project.objects.filter(slug=PROJECT_SLUG).first()
    if project is None:
        return None
    return Map.objects.filter(project=project, title=MAP_TITLE).first()


def _counts():
    """أعداد الصفوف لكل الجداول المعنية بالهجرة (maps مصدر الحقيقة بعد Phase A1)."""
    from maps.models import MapContribution, MapDistributionRecord, MapItem, MapProduct
    from sponsorships.models import (
        Documentation, Invoice, Order, Payment, RepresentativeProfile,
        Sponsorship, SupplierProfile,
    )
    from volunteering import models as vol

    map_obj = _tafaqqadhum_map()
    map_id = map_obj.id if map_obj else None

    def scoped(qs):
        return qs.count() if map_id else 0

    counts = {
        # ---- خارطة تفقدهم (maps — مصدر الحقيقة) ----
        "maps.MapProduct": scoped(MapProduct.objects.filter(map_id=map_id)),
        "maps.MapDistributionRecord": scoped(MapDistributionRecord.objects.filter(map_id=map_id)),
        "maps.region_items": scoped(MapItem.objects.filter(map_id=map_id, data__kind="region")),
        "maps.outlet_items": scoped(MapItem.objects.filter(map_id=map_id, data__kind="outlet")),
        "maps.MapContribution": scoped(MapContribution.objects.filter(map_id=map_id)),
        # ---- كفالات السقيا ----
        "sponsorships.Sponsorship": Sponsorship.objects.count(),
        "sponsorships.Order": Order.objects.count(),
        "sponsorships.Invoice": Invoice.objects.count(),
        "sponsorships.Payment": Payment.objects.count(),
        "sponsorships.Documentation": Documentation.objects.count(),
        "sponsorships.SupplierProfile": SupplierProfile.objects.count(),
        "sponsorships.RepresentativeProfile": RepresentativeProfile.objects.count(),
        # ---- التطوع ----
        "volunteering.VolunteeringProfile": vol.VolunteeringProfile.objects.count(),
        "services.Service": __import__("services.models", fromlist=["Service"]).Service.objects.count(),
        "services.ServiceRequest": __import__("services.models", fromlist=["ServiceRequest"]).ServiceRequest.objects.count(),
        "services.ServiceVolunteerApplication": __import__("services.models", fromlist=["ServiceVolunteerApplication"]).ServiceVolunteerApplication.objects.count(),
        "services.Suggestion": __import__("services.models", fromlist=["Suggestion"]).Suggestion.objects.count(),
        "services.WaterSupplyRequest": __import__("services.models", fromlist=["WaterSupplyRequest"]).WaterSupplyRequest.objects.count(),
        "volunteering.Volunteer": vol.Volunteer.objects.count(),
        "volunteering.ProjectAssignment": vol.ProjectAssignment.objects.count(),
        "volunteering.Task": vol.Task.objects.count(),
        "volunteering.Subtask": vol.Subtask.objects.count(),
        "reporting.AdminReport": __import__("reporting.models", fromlist=["AdminReport"]).AdminReport.objects.count(),
        "volunteering.VolunteerApplication": vol.VolunteerApplication.objects.count(),
        "reporting.VolunteerStatistics": __import__("reporting.models", fromlist=["VolunteerStatistics"]).VolunteerStatistics.objects.count(),
        "reporting.QuarterlyTarget": __import__("reporting.models", fromlist=["QuarterlyTarget"]).QuarterlyTarget.objects.count(),
        "reporting.DepartmentHours": __import__("reporting.models", fromlist=["DepartmentHours"]).DepartmentHours.objects.count(),
        "reporting.TopVolunteer": __import__("reporting.models", fromlist=["TopVolunteer"]).TopVolunteer.objects.count(),
    }
    return counts


INVARIANT_KEYS = [
    "maps.MapProduct", "maps.MapDistributionRecord",
    "maps.region_items", "maps.outlet_items", "maps.MapContribution",
    "sponsorships.Sponsorship", "sponsorships.Order", "sponsorships.Invoice",
    "sponsorships.Payment", "sponsorships.Documentation",
    "sponsorships.SupplierProfile", "sponsorships.RepresentativeProfile",
    "volunteering.VolunteeringProfile", "services.Service", "services.ServiceRequest",
    "services.ServiceVolunteerApplication", "services.Suggestion", "services.WaterSupplyRequest",
    "volunteering.Volunteer", "volunteering.ProjectAssignment", "volunteering.Task",
    "volunteering.Subtask", "reporting.AdminReport",
    "volunteering.VolunteerApplication", "reporting.VolunteerStatistics",
    "reporting.QuarterlyTarget", "reporting.DepartmentHours",
    "reporting.TopVolunteer",
]


def _cross_checks(expect: str):
    """فحوصات سلامة خريطة «تفقدهم» حسب الحالة المتوقعة."""
    from maps.models import MapContribution, MapDistributionRecord, MapItem, MapProduct
    from projects.models import Project
    from sponsorships.models import Sponsorship

    failures = []
    info = {}
    copied_map = _tafaqqadhum_map()

    if expect == "migrated":
        for slug in ("saqya", "tafaqqadhum", "takaful-athar"):
            if not Project.objects.filter(slug=slug).exists():
                failures.append(f"المشروع الأساسي مفقود: {slug}")

        if copied_map is None:
            failures.append("خريطة «تفقدهم» غير موجودة")
        else:
            dist_count = MapDistributionRecord.objects.filter(map=copied_map).count()
            product_count = MapProduct.objects.filter(map=copied_map).count()
            checks = [
                ("distribution records have products",
                 MapDistributionRecord.objects.filter(map=copied_map, product__isnull=True).count(), 0),
                ("distribution records have region items",
                 MapDistributionRecord.objects.filter(map=copied_map, region_item__isnull=True).count(), 0),
            ]
            if product_count > 0 and dist_count > 0:
                checks.append(
                    ("products with distributions",
                     MapDistributionRecord.objects.filter(map=copied_map).values("product").distinct().count(),
                     min(product_count, dist_count) if dist_count else 0)
                )
            for label, got, want_max in checks:
                info[label] = {"got": got, "want": want_max}
                if label.endswith("have products") or label.endswith("have region items"):
                    if got != 0:
                        failures.append(f"سجلات توزيع ناقصة: {label} (got={got})")

        unlinked = Sponsorship.objects.filter(project__isnull=True).count()
        info["sponsorships unlinked to project"] = {"got": unlinked, "want": 0}
        if unlinked:
            failures.append(f"كفالات غير مرتبطة بمشروع: {unlinked}")

    elif expect == "reverted":
        if copied_map is not None:
            failures.append("العكس لم يحذف خريطة «تفقدهم»")
        try:
            linked = Sponsorship.objects.filter(project__isnull=False).count()
        except Exception:
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
            for key, value in counts.items():
                self.stdout.write(f"  {key}: {value}")
            return

        if failures:
            for failure in failures:
                self.stderr.write(self.style.ERROR(f"FAIL: {failure}"))
            raise CommandError(f"فشل فحص السلامة: {len(failures)} اختلال")
        self.stdout.write(self.style.SUCCESS("سلامة البيانات مؤكدة — لا اختلالات"))
