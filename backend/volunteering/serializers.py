from rest_framework import serializers
from .models import (
    Project, Service, ServiceRequest, ServiceVolunteerApplication, Volunteer, Suggestion,
    ProjectAssignment, Task, Subtask, AdminReport, VolunteerApplication,
    VolunteerStatistics, QuarterlyTarget, DepartmentHours, TopVolunteer,
    WaterSupplyRequest
)
from django.contrib.auth.models import User


class ProjectSerializer(serializers.ModelSerializer):
    status_display = serializers.SerializerMethodField()
    description = serializers.CharField(source='desc', read_only=True)  # Alias for frontend compatibility

    class Meta:
        model = Project
        fields = [
            'id',
            'title',
            'desc',
            'description',  # Read-only alias for desc
            'category',
            'target_audience',
            'beneficiaries',
            'location',
            'donation_amount',
            'start_date',
            'end_date',
            'implementation_requirements',
            'project_goals',
            'estimated_hours',
            'supervisor',
            'duration',
            'tags',
            'progress',
            'organization',
            'hours',
            'is_hidden',
            'status',
            'status_display',  # Arabic status for frontend
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at', 'description', 'status_display']

    def get_status_display(self, obj):
        """Return Arabic status display"""
        status_map = {
            'ACTIVE': 'نشط',
            'PLANNED': 'متوقف',
            'COMPLETED': 'مكتمل',
            'CANCELLED': 'ملغي'
        }
        return status_map.get(obj.status, 'نشط')


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
        read_only_fields = ['applied_at', 'reviewed_at', 'reviewed_by', 'volunteer_name', 'volunteer_email', 'service_title', 'reviewed_by_name']


class VolunteerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Volunteer
        fields = ['id', 'full_name', 'phone', 'email', 'is_active', 'created_at']
        read_only_fields = ['created_at']


class SuggestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Suggestion
        fields = ['id', 'title', 'description', 'submitted_by', 'created_at', 'is_reviewed']
        read_only_fields = ['created_at']


class ProjectAssignmentSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source='user.email', read_only=True)
    user_name = serializers.CharField(source='user.profile.name', read_only=True)
    project_title = serializers.CharField(source='project.title', read_only=True)
    
    class Meta:
        model = ProjectAssignment
        fields = [
            'id',
            'project',
            'user',
            'user_email',
            'user_name',
            'project_title',
            'status',
            'assigned_at',
            'completed_at',
            'hours_contributed',
            'progress',
            'notes',
        ]
        read_only_fields = ['assigned_at']


# ============================================================================
# NEW SERIALIZERS FOR VOLUNTEER MANAGEMENT
# ============================================================================

class SubtaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subtask
        fields = ['id', 'title', 'completed', 'order', 'created_at']
        read_only_fields = ['created_at']


class TaskSerializer(serializers.ModelSerializer):
    volunteer_name = serializers.SerializerMethodField()
    volunteer_id = serializers.IntegerField(source='volunteer.id', read_only=True, allow_null=True)
    project_name = serializers.CharField(source='project.title', read_only=True)
    subtasks = SubtaskSerializer(many=True, required=False)
    
    class Meta:
        model = Task
        fields = [
            'id',
            'title',
            'description',
            'project',
            'project_name',
            'volunteer',
            'volunteer_id',
            'volunteer_name',
            'status',
            'priority',
            'due_date',
            'hours',
            'progress',
            'subtasks',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at', 'progress']
    
    def get_volunteer_name(self, obj):
        if obj.volunteer and hasattr(obj.volunteer, 'profile'):
            return obj.volunteer.profile.name
        return None
    
    def update(self, instance, validated_data):
        subtasks_data = validated_data.pop('subtasks', None)

        # Track if task was already completed before this update
        was_completed = instance.status == 'مكتملة'

        # Update task fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        # Update subtasks if provided
        if subtasks_data is not None:
            # Delete existing subtasks and create new ones
            instance.subtasks.all().delete()
            for subtask_data in subtasks_data:
                Subtask.objects.create(task=instance, **subtask_data)

        # Recalculate progress based on subtasks
        instance.progress = instance.calculate_progress()
        instance.save()

        # Update volunteer profile stats based on completion status change
        is_now_completed = instance.status == 'مكتملة'

        if instance.volunteer:
            profile = instance.volunteer.profile

            # Task just became completed - add stats
            if is_now_completed and not was_completed:
                profile.total_volunteer_hours += instance.hours or 0
                profile.completed_tasks_count += 1
                profile.points = profile.total_volunteer_hours + (profile.completed_tasks_count * 10)
                profile.save()

            # Task was un-completed - subtract stats
            elif was_completed and not is_now_completed:
                profile.total_volunteer_hours = max(0, profile.total_volunteer_hours - (instance.hours or 0))
                profile.completed_tasks_count = max(0, profile.completed_tasks_count - 1)
                profile.points = profile.total_volunteer_hours + (profile.completed_tasks_count * 10)
                profile.save()

        return instance


class VolunteerDetailSerializer(serializers.ModelSerializer):
    """
    Detailed volunteer information for VolunteerManagement page
    """
    name = serializers.CharField(source='profile.name', read_only=True)
    phone = serializers.CharField(source='profile.phone', read_only=True)
    location = serializers.CharField(source='profile.city', read_only=True)
    skills = serializers.JSONField(source='profile.skills', read_only=True)
    available_days = serializers.JSONField(source='profile.available_days', read_only=True)
    qualification = serializers.CharField(source='profile.qualification', read_only=True)
    university = serializers.CharField(source='profile.university', read_only=True)
    specialization = serializers.CharField(source='profile.specialization', read_only=True)
    rating = serializers.DecimalField(source='profile.rating', max_digits=3, decimal_places=1, read_only=True)
    volunteer_hours = serializers.IntegerField(source='profile.total_volunteer_hours', read_only=True)
    completed_tasks = serializers.IntegerField(source='profile.completed_tasks_count', read_only=True)
    join_date = serializers.DateTimeField(source='date_joined', read_only=True)

    # Current tasks count
    current_tasks = serializers.SerializerMethodField()
    current_projects = serializers.SerializerMethodField()

    # Status based on task load
    status = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id',
            'email',
            'name',
            'phone',
            'location',
            'status',
            'skills',
            'available_days',
            'qualification',
            'university',
            'specialization',
            'completed_tasks',
            'current_tasks',
            'rating',
            'join_date',
            'volunteer_hours',
            'current_projects',
        ]
    
    def get_current_tasks(self, obj):
        return obj.assigned_tasks.exclude(status='مكتملة').count()
    
    def get_current_projects(self, obj):
        # Get unique project titles from current task assignments
        tasks = obj.assigned_tasks.exclude(status='مكتملة')
        return list(set([task.project.title for task in tasks]))
    
    def get_status(self, obj):
        current_tasks_count = self.get_current_tasks(obj)
        if current_tasks_count == 0:
            return "غير نشط"
        elif current_tasks_count >= 5:
            return "مشغول"
        else:
            return "نشط"


class VolunteerRequestSerializer(serializers.ModelSerializer):
    """
    For pending volunteer approval requests
    Uses Profile model fields
    """
    name = serializers.CharField(source='profile.name')
    location = serializers.CharField(source='profile.city')
    skills = serializers.JSONField(source='profile.skills')
    qualification = serializers.CharField(source='profile.qualification')
    university = serializers.CharField(source='profile.university')
    specialization = serializers.CharField(source='profile.specialization')
    rating = serializers.DecimalField(source='profile.rating', max_digits=3, decimal_places=1)
    volunteer_hours = serializers.IntegerField(source='profile.total_volunteer_hours')
    phone = serializers.CharField(source='profile.phone')

    class Meta:
        model = User
        fields = [
            'id',
            'name',
            'location',
            'email',
            'phone',
            'qualification',
            'university',
            'specialization',
            'skills',
            'volunteer_hours',
            'rating',
        ]


class AdminReportSerializer(serializers.ModelSerializer):
    """
    Serializer for AdminReport model
    """
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


class VolunteerApplicationSerializer(serializers.ModelSerializer):
    """
    Serializer for VolunteerApplication model
    Used for volunteer applications to projects
    """
    volunteer_name = serializers.CharField(source='volunteer.profile.name', read_only=True)
    volunteer_email = serializers.EmailField(source='volunteer.email', read_only=True)
    project_title = serializers.CharField(source='project.title', read_only=True)
    reviewed_by_name = serializers.SerializerMethodField()

    class Meta:
        model = VolunteerApplication
        fields = [
            'id',
            'volunteer',
            'volunteer_name',
            'volunteer_email',
            'project',
            'project_title',
            'status',
            'message',
            'admin_notes',
            'applied_at',
            'reviewed_at',
            'reviewed_by',
            'reviewed_by_name',
        ]
        read_only_fields = ['applied_at', 'reviewed_at']

    def get_reviewed_by_name(self, obj):
        if obj.reviewed_by and hasattr(obj.reviewed_by, 'profile'):
            return obj.reviewed_by.profile.name
        return None


# ============================================================================
# VOLUNTEER STATISTICS SERIALIZERS
# ============================================================================

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

    # Formatted display values
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


# ============================================================================
# WATER SUPPLY REQUEST SERIALIZER
# ============================================================================

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