"""
واجهات نظام الخرائط:
- عامة (AllowAny): فهرس الخرائط المعلنة (المجمّع الموحّد /map مع فلترة بالمشروع)،
  تفاصيل خريطة عبر الفلتر المركزي، ملخص مجمّع مع إخفاء PDPL،
  ومساهمة عامة بمعدل محدود (PublicWriteRateThrottle).
- أدمن: CRUD مقيّد بعضوية المشروع؛ إنشاء/حذف الخرائط للمشرف العام فقط (provisioning).
Thin views — المنطق في services.py.
"""
from django.utils import timezone

from rest_framework import status, viewsets
from rest_framework.decorators import action, api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from core.permissions import is_super_admin
from core.throttles import PublicWriteRateThrottle
from projects import services as project_services

from . import services
from .models import Map, MapContribution, MapItem, MapItemField, MapLayer
from .permissions import IsSuperAdminOrMapProjectStaff, scoped_maps_queryset
from .serializers import (
    MapAdminSerializer,
    MapContributionAdminSerializer,
    MapItemAdminSerializer,
    MapItemFieldAdminSerializer,
    MapLayerAdminSerializer,
    PublicContributionCreateSerializer,
)


def _public_map_or_none(pk):
    return (
        Map.objects.filter(
            pk=pk,
            visibility__in=["public", "mixed"],
            published_at__isnull=False,
            project__is_active=True,
            project__status="active",  # النشطة فقط تظهر عامّاً (D-43)
        )
        .select_related("project")
        .first()
    )


# ---- عام ----
@api_view(["GET"])
@permission_classes([AllowAny])
def public_maps_index(request):
    """المجمّع الموحّد: كل الخرائط المعلنة مع فلترة اختيارية ?project=slug."""
    return Response(services.public_maps_index(project_slug=request.GET.get("project")))


@api_view(["GET"])
@permission_classes([AllowAny])
def public_map_detail(request, pk):
    map_obj = _public_map_or_none(pk)
    if not map_obj:
        return Response({"detail": "الخريطة غير متاحة"}, status=status.HTTP_404_NOT_FOUND)
    return Response(services.build_public_map_detail(map_obj))


@api_view(["GET"])
@permission_classes([AllowAny])
def public_map_summary(request, pk):
    map_obj = _public_map_or_none(pk)
    if not map_obj:
        return Response({"detail": "الخريطة غير متاحة"}, status=status.HTTP_404_NOT_FOUND)
    return Response(services.build_map_summary(map_obj))


@api_view(["POST"])
@permission_classes([AllowAny])
@throttle_classes([PublicWriteRateThrottle])
def public_map_contribution_create(request, pk):
    map_obj = _public_map_or_none(pk)
    if not map_obj:
        return Response({"detail": "الخريطة غير متاحة"}, status=status.HTTP_404_NOT_FOUND)
    serializer = PublicContributionCreateSerializer(
        data=request.data, context={"map": map_obj}
    )
    serializer.is_valid(raise_exception=True)
    extra = {"map": map_obj}
    if request.user and request.user.is_authenticated:
        extra["user"] = request.user
    contribution = serializer.save(**extra)
    return Response(
        {"message": "تم استلام تعهدكم بنجاح", "id": contribution.id, "status": contribution.status},
        status=status.HTTP_201_CREATED,
    )


# ---- أدمن ----
class MapViewSet(viewsets.ModelViewSet):
    serializer_class = MapAdminSerializer
    permission_classes = [IsSuperAdminOrMapProjectStaff]

    def get_queryset(self):
        return scoped_maps_queryset(
            self.request.user, Map.objects.select_related("project").all()
        )

    def create(self, request, *args, **kwargs):
        if not is_super_admin(request.user):
            return Response(
                {"detail": "إنشاء الخرائط (provisioning) متاح للمشرف العام فقط"},
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def destroy(self, request, *args, **kwargs):
        if not is_super_admin(request.user):
            return Response(
                {"detail": "حذف الخرائط متاح للمشرف العام فقط"},
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().destroy(request, *args, **kwargs)

    def perform_update(self, serializer):
        self._require_manage(serializer.instance.project)
        serializer.save()

    def _require_manage(self, project):
        from rest_framework.exceptions import PermissionDenied

        if not project_services.can_manage_project(self.request.user, project):
            raise PermissionDenied("غير مصرّح بإدارة خرائط هذا المشروع")

    @action(detail=True, methods=["post"])
    def publish(self, request, pk=None):
        map_obj = self.get_object()
        self._require_manage(map_obj.project)
        map_obj.published_at = timezone.now()
        map_obj.save(update_fields=["published_at"])
        return Response({"message": "تم نشر الخريطة", "published_at": map_obj.published_at})

    @action(detail=True, methods=["post"])
    def unpublish(self, request, pk=None):
        map_obj = self.get_object()
        self._require_manage(map_obj.project)
        map_obj.published_at = None
        map_obj.save(update_fields=["published_at"])
        return Response({"message": "تم إلغاء نشر الخريطة"})


class _MapChildViewSet(viewsets.ModelViewSet):
    """أساس مشترك: النطاق عبر map__project وتحقّق كتابة عبر can_edit_project_content."""

    permission_classes = [IsSuperAdminOrMapProjectStaff]

    def get_queryset(self):
        qs = self.base_queryset()
        if is_super_admin(self.request.user):
            return qs
        return qs.filter(
            map__project_id__in=project_services.user_project_ids(self.request.user)
        )

    def _require_edit(self, map_obj):
        from rest_framework.exceptions import PermissionDenied

        if not project_services.can_edit_project_content(self.request.user, map_obj.project):
            raise PermissionDenied("غير مصرّح بتحرير محتوى هذا المشروع")

    def perform_create(self, serializer):
        self._require_edit(serializer.validated_data["map"])
        serializer.save()

    def perform_update(self, serializer):
        self._require_edit(serializer.instance.map)
        serializer.save()

    def perform_destroy(self, instance):
        self._require_edit(instance.map)
        instance.delete()


class MapLayerViewSet(_MapChildViewSet):
    serializer_class = MapLayerAdminSerializer

    def base_queryset(self):
        return MapLayer.objects.select_related("map__project").all()


class MapItemFieldViewSet(_MapChildViewSet):
    serializer_class = MapItemFieldAdminSerializer

    def base_queryset(self):
        return MapItemField.objects.select_related("map__project").all()


class MapItemViewSet(_MapChildViewSet):
    serializer_class = MapItemAdminSerializer

    def base_queryset(self):
        qs = MapItem.objects.select_related("map__project", "layer").all()
        map_id = self.request.GET.get("map")
        if map_id:
            qs = qs.filter(map_id=map_id)
        return qs

    def perform_create(self, serializer):
        self._require_edit(serializer.validated_data["map"])
        serializer.save(created_by=self.request.user)


class MapContributionViewSet(_MapChildViewSet):
    serializer_class = MapContributionAdminSerializer
    http_method_names = ["get", "head", "options", "patch", "delete", "post"]

    def base_queryset(self):
        qs = MapContribution.objects.select_related("map__project", "item", "user").all()
        map_id = self.request.GET.get("map")
        if map_id:
            qs = qs.filter(map_id=map_id)
        return qs

    def create(self, request, *args, **kwargs):
        return Response(
            {"detail": "استخدم نقطة التعهد العامة للإنشاء"},
            status=status.HTTP_405_METHOD_NOT_ALLOWED,
        )

    def _set_status(self, new_status, message):
        c = self.get_object()
        self._require_edit(c.map)
        c.status = new_status
        c.save(update_fields=["status"])
        return Response({"message": message, "status": c.status})

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        return self._set_status("approved", "تم اعتماد التعهد")

    @action(detail=True, methods=["post"])
    def fulfill(self, request, pk=None):
        return self._set_status("fulfilled", "تم تنفيذ التعهد")

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        return self._set_status("cancelled", "تم إلغاء التعهد")
