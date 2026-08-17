"""تقارير وإحصائيات — مسارات /api/ (D-34: owned by reporting app via root include)."""
from django.urls import path

from . import views

urlpatterns = [
    path("admin/volunteer-statistics/", views.admin_volunteer_statistics, name="admin-volunteer-statistics"),
    path("admin/upload-statistics/", views.upload_volunteer_statistics, name="upload-statistics"),
    path("public-volunteer-statistics/", views.public_volunteer_statistics, name="public-volunteer-statistics"),
    path("reports/projects-progress/", views.projects_progress_report, name="projects-progress"),
    path("reports/volunteers-performance/", views.volunteers_performance_report, name="volunteers-performance"),
    path("reports/volunteer-tasks/", views.volunteer_tasks_report, name="volunteer-tasks"),
    path("reports/generate/", views.generate_report, name="generate-report"),
    path("reports/", views.list_reports, name="list-reports"),
    path("reports/<int:report_id>/", views.get_report_detail, name="report-detail"),
    path("reports/<int:report_id>/delete/", views.delete_report, name="delete-report"),
]
