"""Aggregate helpers and lookups for legacy /api/map/* adapter (maps as source of truth)."""
from django.db.models import Sum, Count, Q

from maps.constants import (
    MAP_TITLE, OUTLETS_LAYER_NAME, PROJECT_SLUG, REGIONS_LAYER_NAME,
)
from maps.models import Map, MapContribution, MapDistributionRecord, MapItem, MapLayer, MapProduct
from maps.services import mask_small_count


def get_legacy_map():
    from projects.models import Project

    project = Project.objects.filter(slug=PROJECT_SLUG).first()
    if project is None:
        return None
    return Map.objects.filter(project=project, title=MAP_TITLE).first()


def get_regions_layer(map_obj):
    return MapLayer.objects.filter(map=map_obj, name=REGIONS_LAYER_NAME).first()


def get_outlets_layer(map_obj):
    return MapLayer.objects.filter(map=map_obj, name=OUTLETS_LAYER_NAME).first()


def region_items_qs(map_obj):
    return MapItem.objects.filter(map=map_obj, data__kind="region")


def outlet_items_qs(map_obj):
    return MapItem.objects.filter(map=map_obj, data__kind="outlet")


def find_region_item_by_slug(map_obj, slug: str):
    return region_items_qs(map_obj).filter(data__slug=slug).first()


def find_product_by_slug(map_obj, slug: str):
    return MapProduct.objects.filter(map=map_obj, slug=slug, is_active=True).first()


def region_item_to_legacy(item: MapItem) -> dict:
    data = item.data or {}
    return {
        "id": item.id,
        "name": item.name,
        "slug": data.get("slug", ""),
        "center_lat": item.lat,
        "center_lng": item.lng,
        "boundary": data.get("boundary"),
        "priority": data.get("priority", "medium"),
        "is_active": item.status == "active",
        "order": data.get("order", 0),
    }


def outlet_item_to_legacy(item: MapItem) -> dict:
    data = item.data or {}
    region_id = None
    slug = data.get("region_slug")
    if slug:
        region = find_region_item_by_slug(item.map, slug)
        region_id = region.id if region else None
    return {
        "id": item.id,
        "name": item.name,
        "type": data.get("outlet_type", "sale_point"),
        "lat": item.lat,
        "lng": item.lng,
        "region": region_id,
        "region_slug": slug,
        "address": data.get("address", ""),
        "working_hours": data.get("working_hours", ""),
        "is_active": item.status == "active",
    }


def region_aggregates(map_obj, region_item: MapItem) -> dict:
    dist = MapDistributionRecord.objects.filter(
        map=map_obj, region_item=region_item
    ).aggregate(families=Sum("families_served"), qty=Sum("quantity_distributed"))
    families = int(dist["families"] or 0)
    qty = int(dist["qty"] or 0)
    target = (
        MapProduct.objects.filter(map=map_obj, is_active=True)
        .aggregate(t=Sum("target_families"))["t"]
        or 0
    )
    completion = round(min(100.0, (families / target * 100) if target else 0.0), 1)
    slug = (region_item.data or {}).get("slug", "")
    return {
        "families_served": mask_small_count(families),
        "quantity_distributed": qty,
        "completion_percent": completion,
        "outlets_count": outlet_items_qs(map_obj).filter(
            data__region_slug=slug, status="active"
        ).count(),
    }


def build_public_regions():
    map_obj = get_legacy_map()
    if map_obj is None:
        return []
    rows = []
    for item in region_items_qs(map_obj).filter(status="active").order_by("data__order", "name"):
        agg = region_aggregates(map_obj, item)
        rows.append({**region_item_to_legacy(item), **agg})
    return rows


def build_public_summary():
    map_obj = get_legacy_map()
    if map_obj is None:
        return {
            "families_served": 0,
            "products_distributed": 0,
            "completion_percent": 0.0,
            "regions_active": 0,
            "outlets_active": 0,
            "contributions_pending": 0,
        }
    dist = MapDistributionRecord.objects.filter(map=map_obj).aggregate(
        families=Sum("families_served"), qty=Sum("quantity_distributed")
    )
    families = int(dist["families"] or 0)
    qty = int(dist["qty"] or 0)
    target = (
        MapProduct.objects.filter(map=map_obj, is_active=True)
        .aggregate(t=Sum("target_families"))["t"]
        or 0
    )
    completion = round(min(100.0, (families / target * 100) if target else 0.0), 1)
    return {
        "families_served": families,
        "products_distributed": qty,
        "completion_percent": completion,
        "regions_active": region_items_qs(map_obj).filter(status="active").count(),
        "outlets_active": outlet_items_qs(map_obj).filter(status="active").count(),
        "contributions_pending": MapContribution.objects.filter(
            map=map_obj, status="pending"
        ).count(),
    }


def contribution_to_legacy(c: MapContribution) -> dict:
    product = None
    if c.category:
        product = MapProduct.objects.filter(map=c.map_id, slug=c.category).first()
    return {
        "id": c.id,
        "user": c.user_id,
        "name": c.name,
        "phone": c.phone,
        "region": c.item_id,
        "region_name": c.item.name if c.item_id else "",
        "product": product.id if product else None,
        "product_name": product.name if product else "",
        "quantity": c.quantity,
        "mode": c.mode,
        "status": c.status,
        "note": c.note,
        "created_at": c.created_at,
    }


def distribution_to_legacy(d: MapDistributionRecord) -> dict:
    return {
        "id": d.id,
        "region": d.region_item_id,
        "region_name": d.region_item.name,
        "product": d.product_id,
        "product_name": d.product.name,
        "families_served": d.families_served,
        "quantity_distributed": d.quantity_distributed,
        "recorded_by": d.recorded_by_id,
        "date": d.date,
    }
