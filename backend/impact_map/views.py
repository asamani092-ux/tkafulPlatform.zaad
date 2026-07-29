from django.shortcuts import get_object_or_404
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page

from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from core.throttles import PublicWriteRateThrottle
from takaful_app.views import IsAdmin

from .models import Region, Product, Outlet, Contribution, DistributionRecord, MapProject, ProjectMapLayer
from .permissions import IsSuperAdminOrProjectManager, is_super_admin
from .providers import get_provider
from .serializers import (
    PublicProductSerializer, PublicOutletSerializer, PublicRegionSerializer,
    PublicSummarySerializer, ContributionCreateSerializer,
    RegionAdminSerializer, ProductAdminSerializer, OutletAdminSerializer,
    ContributionAdminSerializer, DistributionRecordAdminSerializer,
    MapProjectPublicSerializer, MapProjectAdminSerializer, ProjectMapLayerAdminSerializer,
)
from .services import build_public_regions, build_public_summary


# ---- Public read (AllowAny + 60s cache) — legacy endpoints (كل المشاريع / توافق خلفي) ----
@api_view(["GET"])
@permission_classes([AllowAny])
@cache_page(60)
def map_summary(request):
    data = build_public_summary()
    return Response(PublicSummarySerializer(data).data)


@api_view(["GET"])
@permission_classes([AllowAny])
@cache_page(60)
def map_regions(request):
    rows = build_public_regions()
    return Response(PublicRegionSerializer(rows, many=True).data)


@api_view(["GET"])
@permission_classes([AllowAny])
@cache_page(60)
def map_products(request):
    qs = Product.objects.filter(is_active=True)
    return Response(PublicProductSerializer(qs, many=True).data)


@api_view(["GET"])
@permission_classes([AllowAny])
@cache_page(60)
def map_outlets(request):
    qs = Outlet.objects.filter(is_active=True).select_related("region")
    return Response(PublicOutletSerializer(qs, many=True).data)


@api_view(["POST"])
@permission_classes([AllowAny])
@throttle_classes([PublicWriteRateThrottle])
def map_contributions_create(request):
    serializer = ContributionCreateSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    extra = {}
    if request.user and request.user.is_authenticated:
        extra["user"] = request.user
    contribution = serializer.save(**extra)
    return Response(
        {"message": "تم استلام تعهدكم بنجاح", "id": contribution.id, "status": contribution.status},
        status=status.HTTP_201_CREATED,
    )


# ---- Public multi-project endpoints (AllowAny + 60s cache) ----
@api_view(["GET"])
@permission_classes([AllowAny])
@cache_page(60)
def map_projects_list(request):
    qs = MapProject.objects.filter(is_active=True).prefetch_related("layers")
    return Response(MapProjectPublicSerializer(qs, many=True).data)


def _active_project(slug):
    return get_object_or_404(MapProject, slug=slug, is_active=True)


@api_view(["GET"])
@permission_classes([AllowAny])
@cache_page(60)
def map_project_markers(request, slug):
    provider = get_provider(_active_project(slug))
    return Response(provider.markers())


@api_view(["GET"])
@permission_classes([AllowAny])
@cache_page(60)
def map_project_regions(request, slug):
    provider = get_provider(_active_project(slug))
    return Response(provider.regions())


@api_view(["GET"])
@permission_classes([AllowAny])
@cache_page(60)
def map_project_kpis(request, slug):
    provider = get_provider(_active_project(slug))
    return Response(provider.kpis())


# ---- Admin: MapProject + ProjectMapLayer (المشرف العام/مسؤول المشروع) ----
class MapProjectViewSet(viewsets.ModelViewSet):
    serializer_class = MapProjectAdminSerializer
    permission_classes = [IsSuperAdminOrProjectManager]

    def get_queryset(self):
        qs = MapProject.objects.all().prefetch_related("layers")
        if is_super_admin(self.request.user):
            return qs
        return qs.filter(manager=self.request.user)

    def create(self, request, *args, **kwargs):
        # إنشاء مشروع جديد للمشرف العام فقط
        if not is_super_admin(request.user):
            return Response({"detail": "إنشاء المشاريع مقصور على المشرف العام"}, status=status.HTTP_403_FORBIDDEN)
        return super().create(request, *args, **kwargs)


class ProjectMapLayerViewSet(viewsets.ModelViewSet):
    serializer_class = ProjectMapLayerAdminSerializer
    permission_classes = [IsSuperAdminOrProjectManager]

    def get_queryset(self):
        qs = ProjectMapLayer.objects.select_related("project").all()
        project_slug = self.request.query_params.get("project")
        if project_slug:
            qs = qs.filter(project__slug=project_slug)
        if is_super_admin(self.request.user):
            return qs
        return qs.filter(project__manager=self.request.user)

    def perform_create(self, serializer):
        project = serializer.validated_data.get("project")
        if not is_super_admin(self.request.user) and (not project or project.manager_id != self.request.user.id):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("يمكنك إضافة طبقات لمشروعك فقط")
        serializer.save()


# ---- Admin CRUD (بيانات المشاريع الذاتية) — مشرف عام أو مسؤول المشروع لمشروعه ----
class ProjectScopedAdminMixin:
    """يقيّد الرؤية/التعديل: المشرف العام يرى الكل، ومسؤول المشروع يرى صفوف مشاريعه فقط."""
    permission_classes = [IsSuperAdminOrProjectManager]

    def scope_queryset(self, qs):
        if is_super_admin(self.request.user):
            return qs
        return qs.filter(project__manager=self.request.user)

    def _validate_project_ownership(self, serializer):
        if is_super_admin(self.request.user):
            return
        project = serializer.validated_data.get("project")
        if not project or project.manager_id != self.request.user.id:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("يمكنك إدارة بيانات مشروعك فقط")

    def perform_create(self, serializer):
        self._validate_project_ownership(serializer)
        serializer.save()

    def perform_update(self, serializer):
        self._validate_project_ownership(serializer)
        serializer.save()


class RegionViewSet(ProjectScopedAdminMixin, viewsets.ModelViewSet):
    serializer_class = RegionAdminSerializer

    def get_queryset(self):
        return self.scope_queryset(Region.objects.all())


class ProductViewSet(ProjectScopedAdminMixin, viewsets.ModelViewSet):
    serializer_class = ProductAdminSerializer

    def get_queryset(self):
        return self.scope_queryset(Product.objects.all())


class OutletViewSet(ProjectScopedAdminMixin, viewsets.ModelViewSet):
    serializer_class = OutletAdminSerializer

    def get_queryset(self):
        return self.scope_queryset(Outlet.objects.select_related("region").all())


class ContributionViewSet(viewsets.ModelViewSet):
    queryset = Contribution.objects.select_related("region", "product", "user").all()
    serializer_class = ContributionAdminSerializer
    permission_classes = [IsAdmin]
    http_method_names = ["get", "head", "options", "patch", "delete", "post"]

    def create(self, request, *args, **kwargs):
        return Response({"detail": "استخدم نقطة التعهد العامة للإنشاء"}, status=status.HTTP_405_METHOD_NOT_ALLOWED)

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        c = self.get_object()
        c.status = "approved"
        c.save(update_fields=["status"])
        return Response({"message": "تم اعتماد التعهد", "status": c.status})

    @action(detail=True, methods=["post"])
    def fulfill(self, request, pk=None):
        c = self.get_object()
        c.status = "fulfilled"
        c.save(update_fields=["status"])
        return Response({"message": "تم تنفيذ التعهد", "status": c.status})

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        c = self.get_object()
        c.status = "cancelled"
        c.save(update_fields=["status"])
        return Response({"message": "تم إلغاء التعهد", "status": c.status})


class DistributionRecordViewSet(ProjectScopedAdminMixin, viewsets.ModelViewSet):
    serializer_class = DistributionRecordAdminSerializer

    def get_queryset(self):
        return self.scope_queryset(
            DistributionRecord.objects.select_related("region", "product", "recorded_by").all()
        )

    def perform_create(self, serializer):
        self._validate_project_ownership(serializer)
        serializer.save(recorded_by=self.request.user)
