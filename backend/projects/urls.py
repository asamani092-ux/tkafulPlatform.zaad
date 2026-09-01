from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register(r"projects", views.ProjectViewSet, basename="platform-project")
router.register(r"project-types", views.ProjectTypeViewSet, basename="project-type")

urlpatterns = [
    path("public/projects/", views.public_projects, name="public-projects"),
    path("public/projects/<slug:slug>/", views.public_project_detail, name="public-project-detail"),
    path("public/project-types/", views.public_project_types, name="public-project-types"),
    path("my-memberships/", views.my_memberships, name="my-memberships"),
    path("tool-config-schema/", views.tool_config_schema, name="tool-config-schema"),
    path("", include(router.urls)),
]
