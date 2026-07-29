"""مزوّد المشاريع الذاتية (تفقدهم/زكاة الفطر): بيانات impact_map مُقسَّمة بالمشروع."""
from ..models import Outlet
from ..services import build_public_regions, build_public_summary
from .base import MapDataProvider


class NativeProvider(MapDataProvider):
    def markers(self):
        if not self.is_enabled("outlets"):
            return []
        out = []
        qs = Outlet.objects.filter(project=self.project, is_active=True).select_related("region")
        for o in qs:
            if not self.is_enabled("outlets", o.type):
                continue
            out.append({
                "id": f"outlet-{o.id}",
                "name": o.name,
                "type": o.type,
                "layer": "outlets",
                "lat": o.lat,
                "lng": o.lng,
                "region_slug": o.region.slug if o.region else None,
                "address": o.address,
                "working_hours": o.working_hours,
                **self.style("outlets", o.type),
            })
        return out

    def regions(self):
        if not self.is_enabled("regions"):
            return []
        return build_public_regions(self.project)

    def kpis(self):
        s = build_public_summary(self.project)
        return [
            {"key": "families_served", "label": "الأسر المستفيدة", "value": s["families_served"], "icon": "Users"},
            {"key": "products_distributed", "label": "وحدات موزّعة", "value": s["products_distributed"], "icon": "Package"},
            {"key": "completion_percent", "label": "نسبة الإنجاز", "value": s["completion_percent"], "unit": "%", "icon": "TrendingUp"},
            {"key": "regions_active", "label": "مناطق نشطة", "value": s["regions_active"], "icon": "MapPin"},
            {"key": "outlets_active", "label": "منافذ نشطة", "value": s["outlets_active"], "icon": "Store"},
        ]
