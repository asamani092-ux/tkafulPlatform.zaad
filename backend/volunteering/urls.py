"""تجميع مسارات التطوّع (legacy /api/*). Services/reporting تُضمَّن من الجذر (D-34)."""
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from . import views
from . import opportunity_views as opp_views

router = DefaultRouter()
router.register(r"projects", views.VolunteeringProfileViewSet, basename="volunteering-profile")
router.register(r"assignments", views.ProjectAssignmentViewSet, basename="assignment")
router.register(r"tasks", views.TaskViewSet, basename="task")

urlpatterns = [
    # <str:> لدعم slug عربي (allow_unicode على Project.slug)
    path(
        "projects/<str:slug>/volunteer/",
        opp_views.public_opportunity_detail,
        name="public-opportunity-detail",
    ),
    path(
        "projects/<str:slug>/volunteer/otp/",
        opp_views.opportunity_request_otp,
        name="opportunity-request-otp",
    ),
    path(
        "projects/<str:slug>/volunteer/register/",
        opp_views.opportunity_register_guest,
        name="opportunity-register-guest",
    ),
    path(
        "projects/<str:slug>/volunteer/confirm/",
        opp_views.opportunity_confirm_user,
        name="opportunity-confirm-user",
    ),
    path(
        "admin/opportunity-registrations/",
        opp_views.admin_opportunity_registrations,
        name="admin-opportunity-registrations",
    ),
    path(
        "admin/opportunity-registrations/<int:registration_id>/approve/",
        opp_views.admin_approve_opportunity_registration,
        name="admin-approve-opportunity-registration",
    ),
    path(
        "admin/opportunity-registrations/<int:registration_id>/reject/",
        opp_views.admin_reject_opportunity_registration,
        name="admin-reject-opportunity-registration",
    ),
    path("public-projects/", views.public_projects, name="public-projects"),
    path("public-volunteers-stats/", views.public_volunteers_stats, name="public-volunteers-stats"),
    path("public-home-stats/", views.public_home_stats, name="public-home-stats"),
    path("stats/", views.admin_stats, name="admin-stats"),
    path("volunteer-stats/", views.volunteer_stats, name="volunteer-stats"),
    path("my-active-project/", views.get_my_active_project, name="my-active-project"),
    path("volunteers/", views.list_volunteers, name="list-volunteers"),
    path("volunteer-requests/", views.volunteer_requests_list, name="volunteer-requests-list"),
    path(
        "volunteer-requests/<int:volunteer_id>/accept/",
        views.accept_volunteer_request,
        name="accept-volunteer",
    ),
    path(
        "volunteer-requests/<int:volunteer_id>/reject/",
        views.reject_volunteer_request,
        name="reject-volunteer",
    ),
    path("admin/applications/", views.list_volunteer_applications, name="list-applications"),
    path(
        "admin/applications/<int:application_id>/accept/",
        views.accept_volunteer_application,
        name="accept-application",
    ),
    path(
        "admin/applications/<int:application_id>/reject/",
        views.reject_volunteer_application,
        name="reject-application",
    ),
    path("users/", views.list_users, name="list-users"),
    path("user/my-stats/", views.my_volunteer_stats, name="my-volunteer-stats"),
    path("user/my-tasks/", views.my_tasks, name="my-tasks"),
    path("user/opportunities/", views.available_opportunities, name="available-opportunities"),
    path(
        "user/opportunities/<int:project_id>/apply/",
        views.apply_to_opportunity,
        name="apply-to-opportunity",
    ),
    path("user/tasks/<int:task_id>/withdraw/", views.withdraw_from_task, name="withdraw-from-task"),
    path(
        "user/tasks/<int:task_id>/update-progress/",
        views.update_task_progress,
        name="update-task-progress",
    ),
    path("", include(router.urls)),
]
