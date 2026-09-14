"""Serializers for reporting app (moved from volunteering — Phase 1 API ownership)."""
from rest_framework import serializers

from .models import (
    AdminReport,
    VolunteerStatistics,
    QuarterlyTarget,
    DepartmentHours,
    TopVolunteer,
)


class AdminReportSerializer(serializers.ModelSerializer):
    """Serializer for AdminReport model."""
    admin_name = serializers.CharField(source='admin.profile.name', read_only=True)
    admin_email = serializers.EmailField(source='admin.email', read_only=True)

    class Meta:
        model = AdminReport
        fields = [
            'id',
            'admin',
            'admin_name',
            'admin_email',
            'title',
            'date_from',
            'date_to',
            'report_data',
            'total_projects',
            'total_volunteers',
            'total_tasks',
            'total_beneficiaries',
            'total_donations',
            'generated_at',
        ]
        read_only_fields = ['generated_at', 'admin_name', 'admin_email']


class QuarterlyTargetSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuarterlyTarget
        fields = ['quarter', 'volunteer_target', 'volunteer_actual', 'hours_target', 'hours_actual']


class DepartmentHoursSerializer(serializers.ModelSerializer):
    label = serializers.CharField(source='department_name_ar')
    value = serializers.IntegerField(source='hours')

    class Meta:
        model = DepartmentHours
        fields = ['label', 'value', 'percentage', 'color', 'department_name', 'department_name_ar']


class TopVolunteerSerializer(serializers.ModelSerializer):
    class Meta:
        model = TopVolunteer
        fields = ['rank', 'name', 'hours']


class VolunteerStatisticsSerializer(serializers.ModelSerializer):
    quarterly_targets = QuarterlyTargetSerializer(many=True, read_only=True)
    department_hours = DepartmentHoursSerializer(many=True, read_only=True)
    top_volunteers = TopVolunteerSerializer(many=True, read_only=True)

    hours_display = serializers.SerializerMethodField()
    volunteers_display = serializers.SerializerMethodField()

    class Meta:
        model = VolunteerStatistics
        fields = [
            'year',
            'total_volunteers',
            'new_volunteers',
            'returning_volunteers',
            'total_hours',
            'hours_display',
            'volunteers_display',
            'total_contribution_value',
            'contribution_value_display',
            'quarterly_targets',
            'department_hours',
            'top_volunteers',
        ]

    def get_hours_display(self, obj):
        return f"{obj.total_hours:,}"

    def get_volunteers_display(self, obj):
        return f"{obj.total_volunteers:,}"
