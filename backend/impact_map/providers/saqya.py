"""مزوّد كفالات السقيا: بيانات حيّة من تطبيق saqya.

خصوصية صارمة: تخشين الإحداثيات (شبكة) لإخفاء الموقع الدقيق، قناع للأعداد <5،
وبلا أي PII (لا أسماء متبرّعين/مبالغ فردية) في المخرجات العامة.
"""
from django.db.models import Sum

from ..serializers import mask_families_count
from ..services import coarsen_coord
from .base import MapDataProvider

# حالات كفالات آمنة للعرض العام فقط
PUBLIC_STATUSES = ["approved", "in_progress", "completed"]


class SaqyaProvider(MapDataProvider):
    def markers(self):
        from saqya.models import Sponsorship, Documentation

        out = []
        if self.is_enabled("sponsorships"):
            qs = Sponsorship.objects.filter(
                status__in=PUBLIC_STATUSES, latitude__isnull=False, longitude__isnull=False,
            )
            for s in qs:
                out.append({
                    "id": f"sp-{s.id}",
                    "name": "كفالة سقيا",
                    "type": s.type,
                    "layer": "sponsorships",
                    "lat": coarsen_coord(s.latitude),
                    "lng": coarsen_coord(s.longitude),
                    "beneficiaries": mask_families_count(s.beneficiaries_count),
                    **self.style("sponsorships", s.type),
                })

        if self.is_enabled("deliveries"):
            docs = Documentation.objects.filter(
                approved=True, latitude__isnull=False, longitude__isnull=False,
            )
            for d in docs:
                out.append({
                    "id": f"doc-{d.id}",
                    "name": d.location_name or "نقطة توثيق ميداني",
                    "type": d.type,
                    "layer": "deliveries",
                    "lat": coarsen_coord(d.latitude),
                    "lng": coarsen_coord(d.longitude),
                    **self.style("deliveries", d.type),
                })
        return out

    def regions(self):
        """تجميع الكفالات إلى شبكة (~11كم) لإخفاء الموقع الدقيق للمستفيد."""
        from saqya.models import Sponsorship

        if not self.is_enabled("regions"):
            return []
        buckets = {}
        qs = Sponsorship.objects.filter(
            status__in=PUBLIC_STATUSES, latitude__isnull=False, longitude__isnull=False,
        )
        for s in qs:
            glat = coarsen_coord(s.latitude, 1)
            glng = coarsen_coord(s.longitude, 1)
            b = buckets.setdefault((glat, glng), {"beneficiaries": 0, "count": 0, "completed": 0})
            b["beneficiaries"] += int(s.beneficiaries_count or 0)
            b["count"] += 1
            if s.status == "completed":
                b["completed"] += 1

        rows = []
        for i, ((glat, glng), b) in enumerate(sorted(buckets.items()), 1):
            completion = round((b["completed"] / b["count"] * 100) if b["count"] else 0.0, 1)
            rows.append({
                "id": i,
                "name": f"نطاق {glat}, {glng}",
                "slug": f"saqya-{glat}-{glng}",
                "center_lat": glat,
                "center_lng": glng,
                "boundary": None,
                "priority": "medium",
                "order": i,
                "families_served": mask_families_count(b["beneficiaries"]),
                "quantity_distributed": b["count"],
                "completion_percent": completion,
                "outlets_count": b["count"],
            })
        return rows

    def kpis(self):
        from saqya.models import Sponsorship

        qs = Sponsorship.objects.filter(status__in=PUBLIC_STATUSES)
        total = qs.count()
        completed = qs.filter(status="completed").count()
        benef = qs.aggregate(s=Sum("beneficiaries_count"))["s"] or 0
        completion = round((completed / total * 100) if total else 0.0, 1)
        return [
            {"key": "sponsorships", "label": "كفالات معتمدة", "value": total, "icon": "HeartHandshake"},
            {"key": "beneficiaries", "label": "المستفيدون", "value": benef, "icon": "Users"},
            {"key": "completed", "label": "كفالات مكتملة", "value": completed, "icon": "CircleCheck"},
            {"key": "completion_percent", "label": "نسبة الإنجاز", "value": completion, "unit": "%", "icon": "TrendingUp"},
        ]
