from rest_framework import serializers
from django.utils.text import slugify

from projects.models import Project
from .models import (
    VolunteeringProfile, Volunteer, ProjectAssignment, Task, Subtask, VolunteerApplication,
    PLATFORM_STATUS_MAP,
)
from . import project_helpers
from django.contrib.auth.models import User


class ProjectSerializer(serializers.ModelSerializer):
    """API serializer for volunteering projects (VolunteeringProfile + platform Project)."""
    id = serializers.IntegerField(source="project.id", read_only=True)
    title = serializers.CharField(source="project.name")
    desc = serializers.CharField(source="project.description", required=False, allow_blank=True)
    description = serializers.CharField(source="project.description", read_only=True)
    start_date = serializers.DateField(source="project.start_date", required=False, allow_null=True)
    end_date = serializers.DateField(source="project.end_date", required=False, allow_null=True)
    status = serializers.CharField(source="volunteer_status")
    status_display = serializers.SerializerMethodField()

    class Meta:
        model = VolunteeringProfile
        fields = [
            'id', 'title', 'desc', 'description', 'category', 'target_audience',
            'beneficiaries', 'location', 'donation_amount', 'start_date', 'end_date',
            'implementation_requirements', 'project_goals', 'estimated_hours',
            'supervisor', 'duration', 'tags', 'progress', 'organization', 'hours',
            'is_hidden', 'status', 'status_display', 'created_at', 'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at', 'description', 'status_display']

    def get_status_display(self, obj):
        status_map = {
            'ACTIVE': 'نشط', 'PLANNED': 'متوقف',
            'COMPLETED': 'مكتمل', 'CANCELLED': 'ملغي',
        }
        return status_map.get(obj.volunteer_status, 'نشط')

    def create(self, validated_data):
        project_data = validated_data.pop("project", {})
        title = project_data.get("name", "")
        desc = project_data.get("description", "")
        start_date = project_data.get("start_date")
        end_date = project_data.get("end_date")
        status = validated_data.get("volunteer_status", "ACTIVE")
        return project_helpers.create_volunteering_project(
            title=title, desc=desc, status=status,
            start_date=start_date, end_date=end_date, **validated_data,
        )

    def update(self, instance, validated_data):
        project_data = validated_data.pop("project", {})
        if "name" in project_data:
            instance.project.name = project_data["name"]
        if "description" in project_data:
            instance.project.description = project_data["description"]
        if "start_date" in project_data:
            instance.project.start_date = project_data["start_date"]
        if "end_date" in project_data:
            instance.project.end_date = project_data["end_date"]
        if "volunteer_status" in validated_data:
            instance.volunteer_status = validated_data["volunteer_status"]
            instance.project.status = PLATFORM_STATUS_MAP.get(
                validated_data["volunteer_status"], instance.project.status
            )
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.project.save()
        instance.save()
        return instance


class VolunteerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Volunteer
        fields = ['id', 'full_name', 'phone', 'email', 'is_active', 'created_at']
        read_only_fields = ['created_at']


class ProjectAssignmentSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source='user.email', read_only=True)
    user_name = serializers.CharField(source='user.profile.name', read_only=True)
    project_title = serializers.CharField(source='project.name', read_only=True)
    
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
    project_name = serializers.CharField(source='project.name', read_only=True)
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
            'is_active',
        ]
    
    def get_current_tasks(self, obj):
        return obj.assigned_tasks.exclude(status='مكتملة').count()
    
    def get_current_projects(self, obj):
        # Get unique project names from current task assignments
        tasks = obj.assigned_tasks.exclude(status='مكتملة')
        return list(set([task.project.name for task in tasks]))
    
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


class VolunteerApplicationSerializer(serializers.ModelSerializer):
    """
    Serializer for VolunteerApplication model
    Used for volunteer applications to projects
    """
    volunteer_name = serializers.CharField(source='volunteer.profile.name', read_only=True)
    volunteer_email = serializers.EmailField(source='volunteer.email', read_only=True)
    project_title = serializers.CharField(source='project.name', read_only=True)
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
