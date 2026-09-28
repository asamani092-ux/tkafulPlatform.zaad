from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register(r"dossiers", views.ProjectDossierViewSet, basename="project-dossier")

urlpatterns = [
    path("schema/", views.dossier_schema, name="projectdocs-schema"),
    path("my-activities/", views.my_assigned_activities, name="projectdocs-my-activities"),
    path(
        "my-activities/<int:activity_id>/",
        views.my_assigned_activity_detail,
        name="projectdocs-my-activity-detail",
    ),
    path(
        "my-activities/<int:activity_id>/complete/",
        views.my_assigned_activity_complete,
        name="projectdocs-my-activity-complete",
    ),
    path("", include(router.urls)),
]
