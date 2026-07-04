from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page

from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from core.throttles import PublicWriteRateThrottle
from takaful_app.views import IsAdmin

from .models import Region, Product, Outlet, Contribution, DistributionRecord
from .serializers import (
    PublicProductSerializer, PublicOutletSerializer, PublicRegionSerializer,
    PublicSummarySerializer, ContributionCreateSerializer,
    RegionAdminSerializer, ProductAdminSerializer, OutletAdminSerializer,
    ContributionAdminSerializer, DistributionRecordAdminSerializer,
)
from .services import build_public_regions, build_public_summary


# ---- Public read (AllowAny + 60s cache) ----
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


# ---- Admin CRUD ----
class RegionViewSet(viewsets.ModelViewSet):
    queryset = Region.objects.all()
    serializer_class = RegionAdminSerializer
    permission_classes = [IsAdmin]


class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductAdminSerializer
    permission_classes = [IsAdmin]


class OutletViewSet(viewsets.ModelViewSet):
    queryset = Outlet.objects.select_related("region").all()
    serializer_class = OutletAdminSerializer
    permission_classes = [IsAdmin]


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


class DistributionRecordViewSet(viewsets.ModelViewSet):
    queryset = DistributionRecord.objects.select_related("region", "product", "recorded_by").all()
    serializer_class = DistributionRecordAdminSerializer
    permission_classes = [IsAdmin]

    def perform_create(self, serializer):
        serializer.save(recorded_by=self.request.user)
