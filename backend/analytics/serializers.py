from rest_framework import serializers
from .models import Employee, DashboardSection, DashboardKpi, StaffTask


class EmployeeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Employee
        fields = [
            "id", "name", "role", "completed_tasks", "progress",
            "icon_key", "is_active",
        ]


class DashboardSectionSerializer(serializers.ModelSerializer):
    class Meta:
        model = DashboardSection
        fields = [
            "id", "title", "unit", "total", "actual", "expected",
            "closed", "in_progress", "near", "late", "review", "not_started",
            "icon_key", "display_order",
        ]


class DashboardKpiSerializer(serializers.ModelSerializer):
    class Meta:
        model = DashboardKpi
        fields = ["id", "title", "value", "subtitle", "icon_key", "display_order"]


class StaffTaskSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source="employee.name", read_only=True, allow_null=True)
    project_title = serializers.CharField(source="project.title", read_only=True, allow_null=True)

    class Meta:
        model = StaffTask
        fields = [
            "id", "title", "employee", "employee_name",
            "initiative", "project", "project_title",
            "completed_date", "progress",
        ]
