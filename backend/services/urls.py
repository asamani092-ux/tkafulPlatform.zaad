"""خدمات المنصّة — مسارات /api/ (legacy paths preserved via volunteering.urls)."""
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from volunteering import views

router = DefaultRouter()
router.register(r"services", views.ServiceViewSet, basename="service")
router.register(r"service-requests", views.ServiceRequestViewSet, basename="service-request")
router.register(r"suggestions", views.SuggestionViewSet, basename="suggestion")
router.register(r"water-supply-requests", views.WaterSupplyRequestViewSet, basename="water-supply-request")

urlpatterns = [
    path("public-suggestions/", views.public_submit_suggestion, name="public-suggestions"),
    path("public-services/", views.public_services_list, name="public-services"),
    path("beneficiary-services/", views.beneficiary_services_list, name="beneficiary-services"),
    path("public-service-request/", views.public_submit_service_request, name="public-service-request"),
    path("public-water-supply-request/", views.public_water_supply_request, name="public-water-supply-request"),
    path(
        "services/<int:service_id>/apply-volunteer/",
        views.apply_to_service_as_volunteer,
        name="apply-to-service-volunteer",
    ),
    path(
        "admin/service-volunteer-applications/",
        views.list_service_volunteer_applications,
        name="list-service-volunteer-applications",
    ),
    path(
        "admin/service-volunteer-applications/<int:application_id>/accept/",
        views.accept_service_volunteer_application,
        name="accept-service-volunteer-application",
    ),
    path(
        "admin/service-volunteer-applications/<int:application_id>/reject/",
        views.reject_service_volunteer_application,
        name="reject-service-volunteer-application",
    ),
    path("", include(router.urls)),
]
