from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register(r"dossiers", views.ProjectDossierViewSet, basename="project-dossier")

urlpatterns = [
    path("schema/", views.dossier_schema, name="projectdocs-schema"),
    path("", include(router.urls)),
]
