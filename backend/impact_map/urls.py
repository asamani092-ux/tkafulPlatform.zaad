from django.urls import path, include
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register(r"admin/regions", views.RegionViewSet, basename="impact-region")
router.register(r"admin/products", views.ProductViewSet, basename="impact-product")
router.register(r"admin/outlets", views.OutletViewSet, basename="impact-outlet")
router.register(r"admin/contributions", views.ContributionViewSet, basename="impact-contribution")
router.register(r"admin/distribution-records", views.DistributionRecordViewSet, basename="impact-distribution")

urlpatterns = [
    path("summary/", views.map_summary, name="map-summary"),
    path("regions/", views.map_regions, name="map-regions"),
    path("products/", views.map_products, name="map-products"),
    path("outlets/", views.map_outlets, name="map-outlets"),
    path("contributions/", views.map_contributions_create, name="map-contributions-create"),
    path("", include(router.urls)),
]
