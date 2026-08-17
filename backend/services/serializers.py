"""Serializers for services app (moved from volunteering — Phase 1 API ownership)."""
from rest_framework import serializers

from .models import (
    Service,
    ServiceRequest,
    ServiceVolunteerApplication,
    Suggestion,
    WaterSupplyRequest,
)


class ServiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Service
        fields = ['id', 'title', 'desc', 'status', 'service_type', 'is_active', 'created_at']
        read_only_fields = ['created_at']


class ServiceRequestSerializer(serializers.ModelSerializer):
    service_title = serializers.CharField(source='service.title', read_only=True)

    class Meta:
        model = ServiceRequest
        fields = [
            'id',
            'service',
            'service_title',
            'beneficiary_name',
            'beneficiary_contact',
            'details',
            'status',
            'created_at',
        ]
        read_only_fields = ['created_at']


class ServiceVolunteerApplicationSerializer(serializers.ModelSerializer):
    volunteer_name = serializers.CharField(source='volunteer.profile.name', read_only=True)
    volunteer_email = serializers.CharField(source='volunteer.email', read_only=True)
    service_title = serializers.CharField(source='service.title', read_only=True)
    reviewed_by_name = serializers.CharField(source='reviewed_by.profile.name', read_only=True, allow_null=True)

    class Meta:
        model = ServiceVolunteerApplication
        fields = [
            'id',
            'volunteer',
            'volunteer_name',
            'volunteer_email',
            'service',
            'service_title',
            'status',
            'message',
            'admin_notes',
            'applied_at',
            'reviewed_at',
            'reviewed_by',
            'reviewed_by_name',
        ]
        read_only_fields = [
            'applied_at', 'reviewed_at', 'reviewed_by',
            'volunteer_name', 'volunteer_email', 'service_title', 'reviewed_by_name',
        ]


class SuggestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Suggestion
        fields = ['id', 'title', 'description', 'submitted_by', 'created_at', 'is_reviewed']
        read_only_fields = ['created_at']


class WaterSupplyRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = WaterSupplyRequest
        fields = [
            'id',
            'applicant_name',
            'mobile_number',
            'applicant_role',
            'mosque_name',
            'neighborhood',
            'location_link',
            'worshippers_count',
            'donor_exists',
            'donor_name',
            'donor_phone',
            'status',
            'admin_notes',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at', 'status', 'admin_notes']
