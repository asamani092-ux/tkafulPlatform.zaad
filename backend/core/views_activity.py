from datetime import datetime, time

from django.utils.dateparse import parse_date, parse_datetime
from django.utils.timezone import get_current_timezone, is_naive, make_aware
from rest_framework import serializers, viewsets
from rest_framework.pagination import PageNumberPagination

from core.models import ActivityLog
from core.permissions import IsAdmin


class ActivityLogPagination(PageNumberPagination):
    page_size = 25
    page_size_query_param = "page_size"
    max_page_size = 100


class ActivityLogSerializer(serializers.ModelSerializer):
    actor_email = serializers.SerializerMethodField()

    class Meta:
        model = ActivityLog
        fields = [
            "id",
            "actor",
            "actor_email",
            "action",
            "target_type",
            "target_id",
            "summary",
            "ip",
            "created_at",
        ]
        read_only_fields = fields

    def get_actor_email(self, obj):
        return obj.actor.email if obj.actor_id else ""


def _bound(value, end=False):
    parsed = parse_datetime(value) or parse_date(value)
    if parsed is None:
        return None
    if not isinstance(parsed, datetime):
        parsed = datetime.combine(parsed, time.max if end else time.min)
    if is_naive(parsed):
        parsed = make_aware(parsed, get_current_timezone())
    return parsed


class ActivityLogViewSet(viewsets.ReadOnlyModelViewSet):
    """GET /api/activity-logs/ — قراءة فقط، مشرف عام."""

    permission_classes = [IsAdmin]
    serializer_class = ActivityLogSerializer
    pagination_class = ActivityLogPagination
    http_method_names = ["get", "head", "options"]
    queryset = ActivityLog.objects.select_related("actor").all()

    def get_queryset(self):
        qs = super().get_queryset()
        params = self.request.query_params
        actor = params.get("actor")
        if actor:
            qs = qs.filter(actor_id=actor)
        action = (params.get("action") or "").strip()
        if action:
            qs = qs.filter(action=action)
        target_type = (params.get("target_type") or "").strip()
        if target_type:
            qs = qs.filter(target_type=target_type)
        start = _bound(params.get("date_from") or "")
        end = _bound(params.get("date_to") or "", end=True)
        if start:
            qs = qs.filter(created_at__gte=start)
        if end:
            qs = qs.filter(created_at__lte=end)
        return qs
