"""Serializers for services app (moved from volunteering — Phase 1 API ownership)."""
from rest_framework import serializers

from .models import (
    Service,
    ServiceRequest,
    ServiceVolunteerApplication,
    Suggestion,
    WaterSupplyRequest,
    RequestForm,
    RequestSubmission,
    FORM_FIELD_TYPES,
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
    project_slug = serializers.CharField(source='project.slug', read_only=True, allow_null=True)
    project_name = serializers.CharField(source='project.name', read_only=True, allow_null=True)

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
            'project',
            'project_slug',
            'project_name',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'created_at', 'updated_at', 'status', 'admin_notes',
            'project_slug', 'project_name',
        ]


class RequestFormSerializer(serializers.ModelSerializer):
    project_name = serializers.CharField(source='project.name', read_only=True, allow_null=True)
    project_slug = serializers.CharField(source='project.slug', read_only=True, allow_null=True)
    submissions_count = serializers.SerializerMethodField()

    class Meta:
        model = RequestForm
        fields = [
            'id', 'project', 'project_name', 'project_slug', 'title', 'slug',
            'description', 'fields_schema', 'is_active', 'submissions_count', 'created_at',
        ]
        read_only_fields = ['created_at', 'project_name', 'project_slug', 'submissions_count']

    def get_submissions_count(self, obj):
        return obj.submissions.count()

    def validate_fields_schema(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError("المخطط يجب أن يكون قائمة حقول")
        keys = set()
        for field in value:
            if not isinstance(field, dict):
                raise serializers.ValidationError("كل حقل يجب أن يكون كائناً")
            key = field.get("key")
            if not key:
                raise serializers.ValidationError("كل حقل يجب أن يملك مفتاحاً (key)")
            if key in keys:
                raise serializers.ValidationError(f"مفتاح مكرّر: {key}")
            keys.add(key)
            ftype = field.get("type", "text")
            if ftype not in FORM_FIELD_TYPES:
                raise serializers.ValidationError(f"نوع حقل غير مدعوم: {ftype}")
        return value


class RequestSubmissionSerializer(serializers.ModelSerializer):
    form_title = serializers.CharField(source='form.title', read_only=True)
    project_name = serializers.CharField(source='form.project.name', read_only=True, allow_null=True)

    class Meta:
        model = RequestSubmission
        fields = [
            'id', 'form', 'form_title', 'project_name', 'data',
            'status', 'admin_notes', 'created_at',
        ]
        read_only_fields = ['created_at', 'form_title', 'project_name']
