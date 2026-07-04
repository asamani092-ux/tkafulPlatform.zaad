"""
بذر بيانات تجريبية لخارطة تفقدهم (12 منطقة بالرياض، 4 منتجات، 8 منافذ).

idempotent: update_or_create على slug — لا يُكرّر الصفوف عند إعادة التشغيل.
التعقيد: O(n) زمن، O(1) مكان لكل صف حيث n ثابت.
"""
from datetime import date

from django.core.management.base import BaseCommand
from django.db import transaction

from impact_map.models import Region, Product, Outlet, DistributionRecord

REGIONS = [
    ("النخيل", "al-nakheel", 24.769, 46.729, "high", 1),
    ("العليا", "al-olaya", 24.695, 46.685, "high", 2),
    ("الروضة", "ar-rawdah", 24.732, 46.772, "medium", 3),
    ("الملز", "al-malaz", 24.687, 46.722, "medium", 4),
    ("السليمانية", "as-sulaimaniyah", 24.712, 46.702, "high", 5),
    ("الشفا", "ash-shifa", 24.558, 46.702, "low", 6),
    ("النسيم", "an-naseem", 24.752, 46.812, "medium", 7),
    ("العزيزية", "al-aziziyah", 24.578, 46.752, "medium", 8),
    ("الخزامى", "al-khuzama", 24.802, 46.642, "low", 9),
    ("الياسمين", "al-yasmin", 24.822, 46.652, "medium", 10),
    ("اليرموك", "al-yarmouk", 24.808, 46.772, "high", 11),
    ("قرطبة", "qurtubah", 24.798, 46.732, "low", 12),
]

PRODUCTS = [
    ("كيس الشتاء", "winter-bag", "❄️", "winter", 500, 1),
    ("السلة الغذائية", "food-basket", "🧺", None, 800, 2),
    ("الحقيبة المدرسية", "school-bag", "🎒", "school", 600, 3),
    ("سلة رمضان", "ramadan-basket", "🌙", "ramadan", 700, 4),
]

OUTLETS = [
    ("نقطة النخيل", "sale_point", 24.771, 46.731, "al-nakheel", "حي النخيل — شارع الأمير سلطان", "9:00–21:00"),
    ("ركن العليا الدائم", "permanent_corner", 24.697, 46.687, "al-olaya", "طريق الملك فهد — برج العليا", "10:00–22:00"),
    ("نقطة الروضة", "participation_point", 24.734, 46.774, "ar-rawdah", "حي الروضة — مجمع خيري", "16:00–20:00"),
    ("نقطة الملز", "sale_point", 24.689, 46.724, "al-malaz", "حي الملز — شارع صلاح الدين", "9:00–18:00"),
    ("ركن السليمانية", "permanent_corner", 24.714, 46.704, "as-sulaimaniyah", "حي السليمانية", "10:00–20:00"),
    ("نقطة الشفا", "participation_point", 24.560, 46.704, "ash-shifa", "حي الشفا — مسجد الحي", "17:00–19:00"),
    ("نقطة النسيم", "sale_point", 24.754, 46.814, "an-naseem", "حي النسيم الغربي", "9:00–21:00"),
    ("ركن اليرموك", "permanent_corner", 24.810, 46.774, "al-yarmouk", "حي اليرموك — مركز تكافل", "10:00–22:00"),
]

# (region_slug, product_slug, families_served, quantity_distributed)
DISTRIBUTIONS = [
    ("al-nakheel", "winter-bag", 120, 120),
    ("al-olaya", "food-basket", 85, 85),
    ("ar-rawdah", "school-bag", 3, 3),       # <5 → masked in public API
    ("al-malaz", "ramadan-basket", 45, 45),
    ("as-sulaimaniyah", "winter-bag", 200, 200),
    ("ash-shifa", "food-basket", 2, 2),      # <5 → masked
    ("an-naseem", "school-bag", 60, 60),
    ("al-aziziyah", "food-basket", 30, 30),
    ("al-khuzama", "winter-bag", 4, 4),      # <5 → masked
    ("al-yasmin", "ramadan-basket", 55, 55),
    ("al-yarmouk", "food-basket", 150, 150),
    ("qurtubah", "school-bag", 25, 25),
]


class Command(BaseCommand):
    help = "بذر بيانات تجريبية لخارطة تفقدهم — idempotent"

    @transaction.atomic
    def handle(self, *args, **options):
        region_by_slug = {}
        for name, slug, lat, lng, priority, order in REGIONS:
            region, _ = Region.objects.update_or_create(
                slug=slug,
                defaults={
                    "name": name,
                    "center_lat": lat,
                    "center_lng": lng,
                    "priority": priority,
                    "is_active": True,
                    "order": order,
                },
            )
            region_by_slug[slug] = region
        self.stdout.write(self.style.SUCCESS(f"Regions: {len(REGIONS)} upserted"))

        product_by_slug = {}
        for name, slug, icon, season, target, order in PRODUCTS:
            product, _ = Product.objects.update_or_create(
                slug=slug,
                defaults={
                    "name": name,
                    "icon": icon,
                    "season": season,
                    "target_families": target,
                    "is_active": True,
                    "order": order,
                },
            )
            product_by_slug[slug] = product
        self.stdout.write(self.style.SUCCESS(f"Products: {len(PRODUCTS)} upserted"))

        for name, otype, lat, lng, region_slug, address, hours in OUTLETS:
            region = region_by_slug.get(region_slug)
            Outlet.objects.update_or_create(
                name=name,
                defaults={
                    "type": otype,
                    "lat": lat,
                    "lng": lng,
                    "region": region,
                    "address": address,
                    "working_hours": hours,
                    "is_active": True,
                },
            )
        self.stdout.write(self.style.SUCCESS(f"Outlets: {len(OUTLETS)} upserted"))

        today = date.today()
        for region_slug, product_slug, families, qty in DISTRIBUTIONS:
            region = region_by_slug[region_slug]
            product = product_by_slug[product_slug]
            DistributionRecord.objects.update_or_create(
                region=region,
                product=product,
                date=today,
                defaults={
                    "families_served": families,
                    "quantity_distributed": qty,
                },
            )
        self.stdout.write(self.style.SUCCESS(f"Distributions: {len(DISTRIBUTIONS)} upserted"))
