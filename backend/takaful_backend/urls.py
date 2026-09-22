"""
URL configuration for takaful_backend project.
"""
from django.contrib import admin
from django.urls import path, include

from projectdocs.views import public_approval_decide, public_approval_get

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("core.urls")),
    path("api/", include("volunteering.urls")),
    # D-34: services/reporting own their API; same /api/* paths (was nested under volunteering.urls)
    path("api/", include("services.urls")),
    path("api/", include("reporting.urls")),
    path("api/accounts/", include("accounts.urls")),
    path("api/dashboard/", include("analytics.urls")),
    path("api/notifications/", include("notifications.urls")),
    path("api/saqya/", include("sponsorships.urls")),  # legacy path → sponsorships (D-05, D-24)
    path("api/sponsorships/", include(("sponsorships.urls", "sponsorships"), namespace="sponsorships")),
    path("api/map/", include("maps.legacy_urls")),
    path("api/platform/", include("projects.urls")),
    path("api/maps/", include("maps.urls")),
    path("api/projectdocs/", include("projectdocs.urls")),
    path("api/public/approvals/<str:token>/", public_approval_get, name="public-approval-get"),
    path(
        "api/public/approvals/<str:token>/decide/",
        public_approval_decide,
        name="public-approval-decide",
    ),
]
