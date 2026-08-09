from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page

from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from core.throttles import PublicWriteRateThrottle
from core.permissions import IsAdmin

from maps.legacy_services import (
    build_public_regions,
    build_public_summary,
    contribution_to_legacy,
    distribution_to_legacy,
    get_legacy_map,
    outlet_item_to_legacy,
    outlet_items_qs,
    region_item_to_legacy,
    region_items_qs,
)
from maps.legacy_serializers import (
    PublicProductSerializer, PublicOutletSerializer, PublicRegionSerializer,
    PublicSummarySerializer, ContributionCreateSerializer,
    RegionAdminSerializer, ProductAdminSerializer, OutletAdminSerializer,
    ContributionAdminSerializer, DistributionRecordAdminSerializer,
)
from maps.models import MapContribution, MapDistributionRecord, MapProduct


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
    map_obj = get_legacy_map()
    qs = MapProduct.objects.filter(map=map_obj, is_active=True) if map_obj else MapProduct.objects.none()
    return Response(PublicProductSerializer(qs, many=True).data)


@api_view(["GET"])
@permission_classes([AllowAny])
@cache_page(60)
def map_outlets(request):
    map_obj = get_legacy_map()
    if map_obj is None:
        return Response([])
    rows = [
        outlet_item_to_legacy(i)
        for i in outlet_items_qs(map_obj).filter(status="active")
    ]
    return Response(PublicOutletSerializer(rows, many=True).data)


@api_view(["POST"])
@permission_classes([AllowAny])
@throttle_classes([PublicWriteRateThrottle])
def map_contributions_create(request):
    serializer = ContributionCreateSerializer(data=request.data, context={"request": request})
    serializer.is_valid(raise_exception=True)
    contribution = serializer.save()
    return Response(
        {"message": "تم استلام تعهدكم بنجاح", "id": contribution.id, "status": contribution.status},
        status=status.HTTP_201_CREATED,
    )


class RegionViewSet(viewsets.ViewSet):
    permission_classes = [IsAdmin]

    def list(self, request):
        map_obj = get_legacy_map()
        rows = [region_item_to_legacy(i) for i in region_items_qs(map_obj)] if map_obj else []
        return Response(rows)

    def retrieve(self, request, pk=None):
        item = region_items_qs(get_legacy_map()).get(pk=pk)
        return Response(region_item_to_legacy(item))

    def create(self, request):
        serializer = RegionAdminSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(serializer.save(), status=status.HTTP_201_CREATED)

    def update(self, request, pk=None):
        item = region_items_qs(get_legacy_map()).get(pk=pk)
        serializer = RegionAdminSerializer(region_item_to_legacy(item), data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(serializer.save())

    def partial_update(self, request, pk=None):
        item = region_items_qs(get_legacy_map()).get(pk=pk)
        serializer = RegionAdminSerializer(region_item_to_legacy(item), data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        return Response(serializer.save())

    def destroy(self, request, pk=None):
        region_items_qs(get_legacy_map()).filter(pk=pk).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ProductViewSet(viewsets.ModelViewSet):
    serializer_class = ProductAdminSerializer
    permission_classes = [IsAdmin]

    def get_queryset(self):
        map_obj = get_legacy_map()
        if map_obj is None:
            return MapProduct.objects.none()
        return MapProduct.objects.filter(map=map_obj)


class OutletViewSet(viewsets.ViewSet):
    permission_classes = [IsAdmin]

    def list(self, request):
        map_obj = get_legacy_map()
        rows = [outlet_item_to_legacy(i) for i in outlet_items_qs(map_obj)] if map_obj else []
        return Response(rows)

    def retrieve(self, request, pk=None):
        item = outlet_items_qs(get_legacy_map()).get(pk=pk)
        return Response(outlet_item_to_legacy(item))

    def create(self, request):
        serializer = OutletAdminSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(serializer.save(), status=status.HTTP_201_CREATED)

    def update(self, request, pk=None):
        item = outlet_items_qs(get_legacy_map()).get(pk=pk)
        serializer = OutletAdminSerializer(outlet_item_to_legacy(item), data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(serializer.save())

    def partial_update(self, request, pk=None):
        item = outlet_items_qs(get_legacy_map()).get(pk=pk)
        serializer = OutletAdminSerializer(outlet_item_to_legacy(item), data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        return Response(serializer.save())

    def destroy(self, request, pk=None):
        outlet_items_qs(get_legacy_map()).filter(pk=pk).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ContributionViewSet(viewsets.ModelViewSet):
    serializer_class = ContributionAdminSerializer
    permission_classes = [IsAdmin]
    http_method_names = ["get", "head", "options", "patch", "delete", "post"]

    def get_queryset(self):
        map_obj = get_legacy_map()
        if map_obj is None:
            return MapContribution.objects.none()
        return MapContribution.objects.filter(map=map_obj).select_related("item", "user")

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
    serializer_class = DistributionRecordAdminSerializer
    permission_classes = [IsAdmin]

    def get_queryset(self):
        map_obj = get_legacy_map()
        if map_obj is None:
            return MapDistributionRecord.objects.none()
        return MapDistributionRecord.objects.filter(map=map_obj).select_related(
            "region_item", "product", "recorded_by"
        )

    def perform_create(self, serializer):
        serializer.save(recorded_by=self.request.user)
