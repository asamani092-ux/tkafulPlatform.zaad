from django.urls import include, path
from rest_framework.routers import DefaultRouter

from core.views_platform_settings import admin_platform_settings, public_platform_settings

from . import views

router = DefaultRouter()
router.register(r"projects", views.ProjectViewSet, basename="platform-project")

urlpatterns = [
    path("public/projects/", views.public_projects, name="public-projects"),
    path("public/projects/<slug:slug>/", views.public_project_detail, name="public-project-detail"),
    path("public-settings/", public_platform_settings, name="public-platform-settings"),
    path("settings/", admin_platform_settings, name="admin-platform-settings"),
    path("my-memberships/", views.my_memberships, name="my-memberships"),
    path("", include(router.urls)),
]
