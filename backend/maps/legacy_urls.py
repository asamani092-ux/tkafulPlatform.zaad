from django.urls import path, include
from rest_framework.routers import DefaultRouter

from . import legacy_views

router = DefaultRouter()
router.register(r"admin/regions", legacy_views.RegionViewSet, basename="impact-region")
router.register(r"admin/products", legacy_views.ProductViewSet, basename="impact-product")
router.register(r"admin/outlets", legacy_views.OutletViewSet, basename="impact-outlet")
router.register(r"admin/contributions", legacy_views.ContributionViewSet, basename="impact-contribution")
router.register(r"admin/distribution-records", legacy_views.DistributionRecordViewSet, basename="impact-distribution")

urlpatterns = [
    path("summary/", legacy_views.map_summary, name="map-summary"),
    path("regions/", legacy_views.map_regions, name="map-regions"),
    path("products/", legacy_views.map_products, name="map-products"),
    path("outlets/", legacy_views.map_outlets, name="map-outlets"),
    path("contributions/", legacy_views.map_contributions_create, name="map-contributions-create"),
    path("", include(router.urls)),
]
