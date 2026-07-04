"""Aggregate helpers for public map API (region-level only, no PII)."""
from django.db.models import Sum, Count

from .models import Region, Product, Outlet, Contribution, DistributionRecord
from .serializers import mask_families_count


def region_aggregates(region: Region) -> dict:
    dist = DistributionRecord.objects.filter(region=region).aggregate(
        families=Sum("families_served"),
        qty=Sum("quantity_distributed"),
    )
    families = int(dist["families"] or 0)
    qty = int(dist["qty"] or 0)
    target = Product.objects.filter(is_active=True).aggregate(t=Sum("target_families"))["t"] or 0
    completion = round(min(100.0, (families / target * 100) if target else 0.0), 1)
    return {
        "families_served": mask_families_count(families),
        "quantity_distributed": qty,
        "completion_percent": completion,
        "outlets_count": Outlet.objects.filter(region=region, is_active=True).count(),
    }


def build_public_regions():
    rows = []
    for region in Region.objects.filter(is_active=True):
        agg = region_aggregates(region)
        rows.append({
            "id": region.id,
            "name": region.name,
            "slug": region.slug,
            "center_lat": region.center_lat,
            "center_lng": region.center_lng,
            "boundary": region.boundary,
            "priority": region.priority,
            "order": region.order,
            **agg,
        })
    return rows


def build_public_summary():
    dist = DistributionRecord.objects.aggregate(
        families=Sum("families_served"),
        qty=Sum("quantity_distributed"),
    )
    families = int(dist["families"] or 0)
    qty = int(dist["qty"] or 0)
    target = Product.objects.filter(is_active=True).aggregate(t=Sum("target_families"))["t"] or 0
    completion = round(min(100.0, (families / target * 100) if target else 0.0), 1)
    return {
        "families_served": families,
        "products_distributed": qty,
        "completion_percent": completion,
        "regions_active": Region.objects.filter(is_active=True).count(),
        "outlets_active": Outlet.objects.filter(is_active=True).count(),
        "contributions_pending": Contribution.objects.filter(status="pending").count(),
    }
