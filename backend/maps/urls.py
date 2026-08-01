from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register(r"admin/maps", views.MapViewSet, basename="maps-map")
router.register(r"admin/layers", views.MapLayerViewSet, basename="maps-layer")
router.register(r"admin/fields", views.MapItemFieldViewSet, basename="maps-field")
router.register(r"admin/items", views.MapItemViewSet, basename="maps-item")
router.register(r"admin/contributions", views.MapContributionViewSet, basename="maps-contribution")

urlpatterns = [
    path("public/", views.public_maps_index, name="maps-public-index"),
    path("public/<int:pk>/", views.public_map_detail, name="maps-public-detail"),
    path("public/<int:pk>/summary/", views.public_map_summary, name="maps-public-summary"),
    path(
        "public/<int:pk>/contributions/",
        views.public_map_contribution_create,
        name="maps-public-contribution",
    ),
    path("", include(router.urls)),
]
