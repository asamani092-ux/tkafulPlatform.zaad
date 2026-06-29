from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r"sections", views.DashboardSectionViewSet, basename="dashboard-section")
router.register(r"employees", views.EmployeeViewSet, basename="dashboard-employee")
router.register(r"kpis", views.DashboardKpiViewSet, basename="dashboard-kpi")
router.register(r"staff-tasks", views.StaffTaskViewSet, basename="staff-task")

urlpatterns = [
    path("executive/", views.executive_dashboard, name="executive-dashboard"),
    path("", include(router.urls)),
]
