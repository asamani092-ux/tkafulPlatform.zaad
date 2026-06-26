from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

# Create router for ViewSets
router = DefaultRouter()
router.register(r'projects', views.ProjectViewSet, basename='project')
router.register(r'services', views.ServiceViewSet, basename='service')
router.register(r'service-requests', views.ServiceRequestViewSet, basename='service-request')  # NEW: Service requests
router.register(r'volunteers-old', views.VolunteerViewSet, basename='volunteer-old')  # Old volunteer model
router.register(r'suggestions', views.SuggestionViewSet, basename='suggestion')
router.register(r'assignments', views.ProjectAssignmentViewSet, basename='assignment')
router.register(r'tasks', views.TaskViewSet, basename='task')  # NEW: Task management

urlpatterns = [
    # Public endpoints (no auth required) - MUST come before router
    path('public-projects/', views.public_projects, name='public-projects'),
    path('public-volunteers-stats/', views.public_volunteers_stats, name='public-volunteers-stats'),
    path('public-suggestions/', views.public_submit_suggestion, name='public-suggestions'),
    path('public-home-stats/', views.public_home_stats, name='public-home-stats'),
    path('public-services/', views.public_services_list, name='public-services'),  # Volunteer opportunity services (/services page)
    path('beneficiary-services/', views.beneficiary_services_list, name='beneficiary-services'),  # Beneficiary services (main page)
    path('public-service-request/', views.public_submit_service_request, name='public-service-request'),  # Submit service request
    path('public-volunteer-statistics/', views.public_volunteer_statistics, name='public-volunteer-statistics'),  # Volunteer statistics for home page
    path('public-water-supply-request/', views.public_water_supply_request, name='public-water-supply-request'),  # Water supply request

    # Admin statistics management
    path('admin/volunteer-statistics/', views.admin_volunteer_statistics, name='admin-volunteer-statistics'),
    path('admin/upload-statistics/', views.upload_volunteer_statistics, name='upload-statistics'),

    # Service volunteer applications (requires auth)
    path('services/<int:service_id>/apply-volunteer/', views.apply_to_service_as_volunteer, name='apply-to-service-volunteer'),

    # Include router URLs
    path('', include(router.urls)),

    # Statistics endpoints
    path('stats/', views.admin_stats, name='admin-stats'),
    path('volunteer-stats/', views.volunteer_stats, name='volunteer-stats'),  # NEW
    path('my-active-project/', views.get_my_active_project, name='my-active-project'),  # 🔥 ADD THIS LINE

    # Volunteer management (NEW)
    path('volunteers/', views.list_volunteers, name='list-volunteers'),

    # Volunteer requests (NEW - for VolunteerRequests.tsx)
    path('volunteer-requests/', views.volunteer_requests_list, name='volunteer-requests-list'),
    path('volunteer-requests/<int:volunteer_id>/accept/', views.accept_volunteer_request, name='accept-volunteer'),
    path('volunteer-requests/<int:volunteer_id>/reject/', views.reject_volunteer_request, name='reject-volunteer'),

    # Volunteer Applications (NEW - separate application system)
    path('admin/applications/', views.list_volunteer_applications, name='list-applications'),
    path('admin/applications/<int:application_id>/accept/', views.accept_volunteer_application, name='accept-application'),
    path('admin/applications/<int:application_id>/reject/', views.reject_volunteer_application, name='reject-application'),

    # Service Volunteer Applications (NEW - volunteers applying to help with services)
    path('admin/service-volunteer-applications/', views.list_service_volunteer_applications, name='list-service-volunteer-applications'),
    path('admin/service-volunteer-applications/<int:application_id>/accept/', views.accept_service_volunteer_application, name='accept-service-volunteer-application'),
    path('admin/service-volunteer-applications/<int:application_id>/reject/', views.reject_service_volunteer_application, name='reject-service-volunteer-application'),

    # Performance reports (NEW)
    path('reports/projects-progress/', views.projects_progress_report, name='projects-progress'),
    path('reports/volunteers-performance/', views.volunteers_performance_report, name='volunteers-performance'),
    path('reports/volunteer-tasks/', views.volunteer_tasks_report, name='volunteer-tasks'),

    # Users list
    path('users/', views.list_users, name='list-users'),

    # Reports endpoints
    path('reports/generate/', views.generate_report, name='generate-report'),
    path('reports/', views.list_reports, name='list-reports'),
    path('reports/<int:report_id>/', views.get_report_detail, name='report-detail'),
    path('reports/<int:report_id>/delete/', views.delete_report, name='delete-report'),

    # ============================================================================
    # VOLUNTEER-SPECIFIC ENDPOINTS (for /user/* pages)
    # ============================================================================
    path('user/my-stats/', views.my_volunteer_stats, name='my-volunteer-stats'),
    path('user/my-tasks/', views.my_tasks, name='my-tasks'),
    path('user/opportunities/', views.available_opportunities, name='available-opportunities'),
    path('user/opportunities/<int:project_id>/apply/', views.apply_to_opportunity, name='apply-to-opportunity'),
    path('user/tasks/<int:task_id>/withdraw/', views.withdraw_from_task, name='withdraw-from-task'),
    path('user/tasks/<int:task_id>/update-progress/', views.update_task_progress, name='update-task-progress'),
]