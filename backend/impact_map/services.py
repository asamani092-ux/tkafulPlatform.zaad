"""Aggregate helpers for public map API (region-level only, no PII).

كل المخرجات العامة PDPL-safe: قناع للأعداد <5، بلا PII، وتخشين إحداثيات حسّاسة.
الدوال تقبل `project` اختيارياً للتقسيم حسب المشروع دون كسر المسارات القديمة (project=None ⇒ الكل).
"""
from django.db.models import Sum

from .models import Region, Product, Outlet, DistributionRecord, Contribution
from .serializers import mask_families_count


# ---- خصوصية PDPL ----
def coarsen_coord(value, precision: int = 2):
    """تخشين إحداثية GPS إلى شبكة (precision=2 ≈ 1.1كم) لإخفاء الموقع الدقيق للمستفيد."""
    if value is None:
        return None
    return round(float(value), precision)


def _scope(qs, project):
    return qs.filter(project=project) if project is not None else qs


def region_aggregates(region: Region, project=None) -> dict:
    dist = _scope(DistributionRecord.objects.filter(region=region), project).aggregate(
        families=Sum("families_served"),
        qty=Sum("quantity_distributed"),
    )
    families = int(dist["families"] or 0)
    qty = int(dist["qty"] or 0)
    target = _scope(Product.objects.filter(is_active=True), project).aggregate(t=Sum("target_families"))["t"] or 0
    completion = round(min(100.0, (families / target * 100) if target else 0.0), 1)
    return {
        "families_served": mask_families_count(families),
        "quantity_distributed": qty,
        "completion_percent": completion,
        "outlets_count": _scope(Outlet.objects.filter(region=region, is_active=True), project).count(),
    }


def build_public_regions(project=None):
    rows = []
    for region in _scope(Region.objects.filter(is_active=True), project):
        agg = region_aggregates(region, project)
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


def build_public_summary(project=None):
    dist = _scope(DistributionRecord.objects.all(), project).aggregate(
        families=Sum("families_served"),
        qty=Sum("quantity_distributed"),
    )
    families = int(dist["families"] or 0)
    qty = int(dist["qty"] or 0)
    target = _scope(Product.objects.filter(is_active=True), project).aggregate(t=Sum("target_families"))["t"] or 0
    completion = round(min(100.0, (families / target * 100) if target else 0.0), 1)
    return {
        "families_served": families,
        "products_distributed": qty,
        "completion_percent": completion,
        "regions_active": _scope(Region.objects.filter(is_active=True), project).count(),
        "outlets_active": _scope(Outlet.objects.filter(is_active=True), project).count(),
        "contributions_pending": _scope(Contribution.objects.filter(status="pending"), project).count(),
    }
