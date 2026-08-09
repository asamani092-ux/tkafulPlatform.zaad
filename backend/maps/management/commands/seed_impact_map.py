"""
بذر بيانات تجريبية لخارطة تفقدهم (12 منطقة بالرياض، 4 منتجات، 8 منافذ).

idempotent: update_or_create على slug — لا يُكرّر الصفوف عند إعادة التشغيل.
يكتب مباشرة إلى نماذج maps (مصدر الحقيقة بعد Phase A1).
"""
from datetime import date

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from maps.constants import (
    DEFAULT_COLOR_SCHEME, MAP_TITLE, OUTLETS_LAYER_NAME,
    PROJECT_SLUG, REGIONS_LAYER_NAME,
)
from maps.models import (
    Map, MapDistributionRecord, MapItem, MapItemField, MapLayer, MapProduct,
)

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

DISTRIBUTIONS = [
    ("al-nakheel", "winter-bag", 120, 120),
    ("al-olaya", "food-basket", 85, 85),
    ("ar-rawdah", "school-bag", 3, 3),
    ("al-malaz", "ramadan-basket", 45, 45),
    ("as-sulaimaniyah", "winter-bag", 200, 200),
    ("ash-shifa", "food-basket", 2, 2),
    ("an-naseem", "school-bag", 60, 60),
    ("al-aziziyah", "food-basket", 30, 30),
    ("al-khuzama", "winter-bag", 4, 4),
    ("al-yasmin", "ramadan-basket", 55, 55),
    ("al-yarmouk", "food-basket", 150, 150),
    ("qurtubah", "school-bag", 25, 25),
]


def _field_defs(products):
    return [
        ("kind", "نوع العنصر", "select", True,
         [{"value": "region", "label": "منطقة"}, {"value": "outlet", "label": "منفذ"}],
         True, 0),
        ("slug", "المعرّف", "text", False, [], True, 1),
        ("priority", "الأولوية", "select", False,
         [{"value": "high", "label": "عالية"}, {"value": "medium", "label": "متوسطة"},
          {"value": "low", "label": "منخفضة"}], True, 2),
        ("boundary", "الحدود الجغرافية", "text", False, [], True, 3),
        ("order", "الترتيب", "number", False, [], True, 4),
        ("outlet_type", "نوع المنفذ", "select", False,
         [{"value": "sale_point", "label": "نقطة بيع"},
          {"value": "permanent_corner", "label": "ركن دائم"},
          {"value": "participation_point", "label": "نقطة مشاركة"}], True, 5),
        ("address", "العنوان", "text", False, [], True, 6),
        ("working_hours", "ساعات العمل (داخلي)", "text", False, [], False, 7),
        ("region_slug", "منطقة المنفذ", "text", False, [], False, 8),
        ("product", "المنتج", "select", False,
         [{"value": p.slug, "label": p.name} for p in products], True, 9),
        ("target_families", "الأسر المستهدفة (داخلي)", "number", False, [], False, 10),
    ]


def ensure_map_structure():
    from projects.models import Project

    project = Project.objects.filter(slug=PROJECT_SLUG).first()
    if project is None:
        raise RuntimeError(f"المشروع {PROJECT_SLUG} غير موجود — شغّل الهجرات أولاً")

    map_obj, _ = Map.objects.get_or_create(
        project=project,
        title=MAP_TITLE,
        defaults={
            "description": "خريطة شفافية توزيع المساهمات على المناطق والمنافذ.",
            "visibility": "mixed",
            "icon_set": {"region": "map-pin", "outlet": "store"},
            "color_scheme": dict(DEFAULT_COLOR_SCHEME),
            "published_at": timezone.now(),
        },
    )
    scheme = dict(map_obj.color_scheme or {})
    missing = {k: v for k, v in DEFAULT_COLOR_SCHEME.items() if k not in scheme}
    if missing:
        scheme.update(missing)
        map_obj.color_scheme = scheme
        map_obj.save(update_fields=["color_scheme"])

    regions_layer, _ = MapLayer.objects.get_or_create(
        map=map_obj, name=REGIONS_LAYER_NAME,
        defaults={"visibility": "public", "order": 0, "style": {"kind": "region"}},
    )
    outlets_layer, _ = MapLayer.objects.get_or_create(
        map=map_obj, name=OUTLETS_LAYER_NAME,
        defaults={"visibility": "public", "order": 1, "style": {"kind": "outlet"}},
    )
    MapLayer.objects.get_or_create(
        map=map_obj, name="ملاحظات داخلية",
        defaults={"visibility": "private", "order": 2, "style": {"kind": "internal"}},
    )
    return map_obj, regions_layer, outlets_layer


class Command(BaseCommand):
    help = "بذر بيانات تجريبية لخارطة تفقدهم — idempotent (maps models)"

    @transaction.atomic
    def handle(self, *args, **options):
        map_obj, regions_layer, outlets_layer = ensure_map_structure()

        region_by_slug = {}
        for name, slug, lat, lng, priority, order in REGIONS:
            item, _ = MapItem.objects.update_or_create(
                map=map_obj, layer=regions_layer, name=name,
                defaults={
                    "lat": lat, "lng": lng, "icon": "map-pin", "status": "active",
                    "data": {"kind": "region", "slug": slug, "priority": priority, "order": order},
                },
            )
            region_by_slug[slug] = item
        self.stdout.write(self.style.SUCCESS(f"Regions: {len(REGIONS)} upserted"))

        product_by_slug = {}
        for name, slug, icon, season, target, order in PRODUCTS:
            product, _ = MapProduct.objects.update_or_create(
                map=map_obj, slug=slug,
                defaults={
                    "name": name, "icon": icon, "season": season,
                    "target_families": target, "is_active": True, "order": order,
                },
            )
            product_by_slug[slug] = product
        self.stdout.write(self.style.SUCCESS(f"Products: {len(PRODUCTS)} upserted"))

        products = list(MapProduct.objects.filter(map=map_obj).order_by("order", "name"))
        for key, label, ftype, required, options, is_public, order in _field_defs(products):
            MapItemField.objects.update_or_create(
                map=map_obj, key=key,
                defaults={
                    "label": label, "type": ftype, "required": required,
                    "options": options, "is_public": is_public, "order": order,
                },
            )

        for name, otype, lat, lng, region_slug, address, hours in OUTLETS:
            MapItem.objects.update_or_create(
                map=map_obj, layer=outlets_layer, name=name,
                defaults={
                    "lat": lat, "lng": lng, "icon": "store", "status": "active",
                    "data": {
                        "kind": "outlet", "outlet_type": otype,
                        "region_slug": region_slug, "address": address, "working_hours": hours,
                    },
                },
            )
        self.stdout.write(self.style.SUCCESS(f"Outlets: {len(OUTLETS)} upserted"))

        today = date.today()
        for region_slug, product_slug, families, qty in DISTRIBUTIONS:
            region_item = region_by_slug[region_slug]
            product = product_by_slug[product_slug]
            MapDistributionRecord.objects.update_or_create(
                map=map_obj, region_item=region_item, product=product, date=today,
                defaults={"families_served": families, "quantity_distributed": qty},
            )
        self.stdout.write(self.style.SUCCESS(f"Distributions: {len(DISTRIBUTIONS)} upserted"))
