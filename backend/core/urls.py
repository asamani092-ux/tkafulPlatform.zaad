from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import ping, uat_status
from .views_platform import admin_platform_settings, public_platform_settings, StaticPageViewSet
from .views_roles import role_catalog_view

router = DefaultRouter()
router.register(r"static-pages", StaticPageViewSet, basename="static-pages")

urlpatterns = [
    path("ping/", ping, name="ping"),
    path("uat/", uat_status, name="uat-status"),
    path("public-settings/", public_platform_settings, name="public-platform-settings"),
    path("settings/", admin_platform_settings, name="admin-platform-settings"),
    path("roles/", role_catalog_view, name="role-catalog"),
    path("", include(router.urls)),
]
