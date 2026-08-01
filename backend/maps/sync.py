"""
مزامنة impact_map → نظام الخرائط (خريطة «تفقدهم») — منطق واحد مشترك بين
هجرة البيانات maps.0002 والأمر الإداري sync_impact_map_to_maps.

idempotent وآمنة لإعادة التشغيل (إضافة تراكمية، لا حذف):
- Map/الطبقات: get_or_create (لا تمسّ التعديلات اليدوية على الظهور بعد الإنشاء).
- الحقول: update_or_create بمفتاح (map, key) — خيارات «المنتج» تُعاد من Product الحالية.
- العناصر: update_or_create بمفتاح (map, layer, name) — impact_map مصدر الحقيقة للعناصر الممزامنة.
- المساهمات: تُنسخ مرة واحدة فقط بوسم external_id="impact_map:<id>" مع الحفاظ على
  created_at الأصلي؛ المساهمات العامة الجديدة (بدون وسم) لا تُمسّ أبداً.

التعقيد: O(R+P+O+C) زمنياً على أعداد صفوف المصدر، O(P) مكانياً؛ فحص تكرار
كل مساهمة O(log N) عبر فهرس (map, external_id).
"""
MAP_TITLE = "خارطة تفقدهم"
PROJECT_SLUG = "tafaqqadhum"
SOURCE_PREFIX = "impact_map:"

# مخطط الألوان الافتراضي: أولويات المناطق + أنواع المنافذ (تقرأه وسيلة الإيضاح في الواجهة)
DEFAULT_COLOR_SCHEME = {
    "high": "#dc2626",
    "medium": "#f2b824",
    "low": "#16a34a",
    "sale_point": "#8b1538",
    "permanent_corner": "#f2b824",
    "participation_point": "#2563eb",
}


def _field_defs(products):
    """تعريفات المخطط الديناميكي — نفس بنية الهجرة الأصلية."""
    return [
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
        # ساعات العمل داخلية (حقل غير عام — يختبر الفلتر المركزي)
        ("working_hours", "ساعات العمل (داخلي)", "text", False, [], False, 7),
        ("product", "المنتج", "select", False,
         [{"value": p.slug, "label": p.name} for p in products], True, 8),
        ("target_families", "الأسر المستهدفة (داخلي)", "number", False, [], False, 9),
    ]


def sync_impact_map_to_maps(apps=None) -> dict:
    """
    ينسخ/يحدّث بيانات impact_map في خريطة «تفقدهم» تحت مشروع tafaqqadhum.
    `apps`: سجل تطبيقات Django — تاريخي داخل الهجرات، أو الحي افتراضياً.
    """
    if apps is None:
        from django.apps import apps
    from django.utils import timezone

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

    stats = {
        "map_created": False, "items_synced": 0,
        "contributions_copied": 0, "contributions_skipped": 0,
    }

    project = Project.objects.filter(slug=PROJECT_SLUG).first()
    if project is None:
        stats["skipped"] = f"المشروع {PROJECT_SLUG} غير موجود — شغّل الهجرات أولاً"
        return stats

    map_obj, map_created = Map.objects.get_or_create(
        project=project,
        title=MAP_TITLE,
        defaults={
            "description": "خريطة شفافية توزيع المساهمات على المناطق والمنافذ (منسوخة من impact_map).",
            "visibility": "mixed",
            "icon_set": {"region": "map-pin", "outlet": "store"},
            "color_scheme": dict(DEFAULT_COLOR_SCHEME),
            "published_at": timezone.now(),
        },
    )
    stats["map_created"] = map_created

    # إضافة تراكمية لمفاتيح الألوان الناقصة على الخرائط القائمة — لا استبدال لتخصيصات يدوية
    scheme = dict(map_obj.color_scheme or {})
    missing = {k: v for k, v in DEFAULT_COLOR_SCHEME.items() if k not in scheme}
    if missing:
        scheme.update(missing)
        map_obj.color_scheme = scheme
        map_obj.save(update_fields=["color_scheme"])

    regions_layer, _ = MapLayer.objects.get_or_create(
        map=map_obj, name="المناطق", defaults={"visibility": "public", "order": 0, "style": {"kind": "region"}},
    )
    outlets_layer, _ = MapLayer.objects.get_or_create(
        map=map_obj, name="المنافذ", defaults={"visibility": "public", "order": 1, "style": {"kind": "outlet"}},
    )
    MapLayer.objects.get_or_create(
        map=map_obj, name="ملاحظات داخلية", defaults={"visibility": "private", "order": 2, "style": {"kind": "internal"}},
    )

    products = list(Product.objects.all().order_by("order", "name"))
    for key, label, ftype, required, options, is_public, order in _field_defs(products):
        MapItemField.objects.update_or_create(
            map=map_obj, key=key,
            defaults={
                "label": label, "type": ftype, "required": required,
                "options": options, "is_public": is_public, "order": order,
            },
        )

    region_items = {}
    for region in Region.objects.all():
        item, _ = MapItem.objects.update_or_create(
            map=map_obj, layer=regions_layer, name=region.name,
            defaults={
                "lat": region.center_lat,
                "lng": region.center_lng,
                "icon": "map-pin",
                "status": "active" if region.is_active else "hidden",
                "data": {
                    "kind": "region",
                    "slug": region.slug,
                    "priority": region.priority,
                    **({"boundary": region.boundary} if region.boundary else {}),
                    "order": region.order,
                },
            },
        )
        region_items[region.id] = item
        stats["items_synced"] += 1

    for outlet in Outlet.objects.all():
        MapItem.objects.update_or_create(
            map=map_obj, layer=outlets_layer, name=outlet.name,
            defaults={
                "lat": outlet.lat,
                "lng": outlet.lng,
                "icon": "store",
                "status": "active" if outlet.is_active else "hidden",
                "data": {
                    "kind": "outlet",
                    "outlet_type": outlet.type,
                    **({"address": outlet.address} if outlet.address else {}),
                    **({"working_hours": outlet.working_hours} if outlet.working_hours else {}),
                },
            },
        )
        stats["items_synced"] += 1

    # المساهمات: نسخ لمرة واحدة بوسم المصدر — لا حذف ولا استبدال (تراكمي)
    existing_refs = set(
        MapContribution.objects.filter(
            map=map_obj, external_id__startswith=SOURCE_PREFIX
        ).values_list("external_id", flat=True)
    )
    for c in Contribution.objects.select_related("region", "product").all():
        ref = f"{SOURCE_PREFIX}{c.id}"
        if ref in existing_refs:
            stats["contributions_skipped"] += 1
            continue
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
            external_id=ref,
        )
        # الحفاظ على تاريخ الإنشاء الأصلي (auto_now_add يتجاوز القيمة عند create)
        MapContribution.objects.filter(pk=mc.pk).update(created_at=c.created_at)
        stats["contributions_copied"] += 1

    return stats
