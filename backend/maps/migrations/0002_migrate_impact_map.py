"""
هجرة بيانات (قابلة للعكس): نسخ بيانات impact_map إلى نظام الخرائط الجديد
تحت مشروع «تفقدهم» (DECISIONS.md D-03/D-04).

الأمامي (copy-forward، جداول المصدر لا تُلمس):
- Map واحدة visibility=mixed بثلاث طبقات: المناطق (public)، المنافذ (public)،
  المساهمات الخاصة (private).
- MapItemField: خصائص المناطق/المنافذ + حقل select «المنتج» من Product
  (بعض الحقول is_public=False مثل ساعات العمل الداخلية).
- Region/Outlet → MapItem في طبقتيهما مع data ديناميكية.
- Contribution → MapContribution (نفس الأعداد صفاً بصف).

العكسي: حذف خريطة «تفقدهم» المنسوخة فقط (cascade يحذف الطبقات/الحقول/العناصر
/المساهمات المنسوخة) — بيانات impact_map الأصلية سليمة في الاتجاهين.

التعقيد: O(R+P+O+C) زمنياً على أعداد صفوف المصدر، O(P) مكانياً.
"""
from django.db import migrations

MAP_TITLE = "خارطة تفقدهم"
LEGACY_SOURCE = "impact_map"


def forward(apps, schema_editor):
    Project = apps.get_model("projects", "Project")
    Map = apps.get_model("maps", "Map")
    MapLayer = apps.get_model("maps", "MapLayer")
    MapItemField = apps.get_model("maps", "MapItemField")
    MapItem = apps.get_model("maps", "MapItem")
    MapContribution = apps.get_model("maps", "MapContribution")

    Region = apps.get_model("impact_map", "Region")
    Product = apps.get_model("impact_map", "Product")
    Outlet = apps.get_model("impact_map", "Outlet")
    Contribution = apps.get_model("impact_map", "Contribution")

    project = Project.objects.filter(slug="tafaqqadhum").first()
    if project is None:
        return
    if Map.objects.filter(project=project, title=MAP_TITLE).exists():
        return  # idempotent

    from django.utils import timezone

    map_obj = Map.objects.create(
        project=project,
        title=MAP_TITLE,
        description="خريطة شفافية توزيع المساهمات على المناطق والمنافذ (منسوخة من impact_map).",
        visibility="mixed",
        icon_set={"region": "map-pin", "outlet": "store"},
        color_scheme={"high": "#dc2626", "medium": "#f2b824", "low": "#16a34a"},
        published_at=timezone.now(),
    )

    regions_layer = MapLayer.objects.create(
        map=map_obj, name="المناطق", visibility="public", order=0,
        style={"kind": "region"},
    )
    outlets_layer = MapLayer.objects.create(
        map=map_obj, name="المنافذ", visibility="public", order=1,
        style={"kind": "outlet"},
    )
    # طبقة خاصة (تُرى للأدمن فقط) — تجعل الخريطة mixed فعلياً
    internal_layer = MapLayer.objects.create(
        map=map_obj, name="ملاحظات داخلية", visibility="private", order=2,
        style={"kind": "internal"},
    )

    # ---- المخطط الديناميكي ----
    products = list(Product.objects.all().order_by("order", "name"))
    field_defs = [
        # (key, label, type, required, options, is_public, order)
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
        # ساعات العمل داخلية (مثال حقل غير عام لاختبار الفلتر المركزي)
        ("working_hours", "ساعات العمل (داخلي)", "text", False, [], False, 7),
        ("product", "المنتج", "select", False,
         [{"value": p.slug, "label": p.name} for p in products], True, 8),
        ("target_families", "الأسر المستهدفة (داخلي)", "number", False, [], False, 9),
    ]
    for key, label, ftype, required, options, is_public, order in field_defs:
        MapItemField.objects.create(
            map=map_obj, key=key, label=label, type=ftype,
            required=required, options=options, is_public=is_public, order=order,
        )

    # ---- المناطق → عناصر ----
    region_items = {}
    for region in Region.objects.all():
        item = MapItem.objects.create(
            map=map_obj,
            layer=regions_layer,
            lat=region.center_lat,
            lng=region.center_lng,
            name=region.name,
            icon="map-pin",
            status="active" if region.is_active else "hidden",
            data={
                "kind": "region",
                "slug": region.slug,
                "priority": region.priority,
                **({"boundary": region.boundary} if region.boundary else {}),
                "order": region.order,
            },
        )
        region_items[region.id] = item

    # ---- المنافذ → عناصر ----
    for outlet in Outlet.objects.all():
        MapItem.objects.create(
            map=map_obj,
            layer=outlets_layer,
            lat=outlet.lat,
            lng=outlet.lng,
            name=outlet.name,
            icon="store",
            status="active" if outlet.is_active else "hidden",
            data={
                "kind": "outlet",
                "outlet_type": outlet.type,
                **({"address": outlet.address} if outlet.address else {}),
                **({"working_hours": outlet.working_hours} if outlet.working_hours else {}),
            },
        )

    # ---- المساهمات → مساهمات الخريطة (تراكمي؛ لا استبدال) ----
    for c in Contribution.objects.select_related("region", "product").all():
        mc = MapContribution.objects.create(
            map=map_obj,
            item=region_items.get(c.region_id),
            category=c.product.slug if c.product_id else "",
            user_id=c.user_id,
            name=c.name,
            phone=c.phone,
            mode=c.mode,
            quantity=c.quantity,
            note=c.note or "",
            status=c.status,
        )
        # الحفاظ على تاريخ الإنشاء الأصلي (auto_now_add يتجاوز القيمة عند create)
        MapContribution.objects.filter(pk=mc.pk).update(created_at=c.created_at)


def backward(apps, schema_editor):
    Project = apps.get_model("projects", "Project")
    Map = apps.get_model("maps", "Map")
    project = Project.objects.filter(slug="tafaqqadhum").first()
    if project is None:
        return
    # حذف المنسوخ فقط — المصدر impact_map لم يُمس
    Map.objects.filter(project=project, title=MAP_TITLE).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("maps", "0001_initial"),
        ("projects", "0002_seed_projects"),
        ("impact_map", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(forward, backward),
    ]
