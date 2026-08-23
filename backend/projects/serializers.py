from django.contrib.auth.models import User
from rest_framework import serializers

from .models import Project, ProjectMember, ProjectTool
from .validators import validate_https_donation_url


class ProjectToolSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProjectTool
        fields = ["id", "tool_key", "config", "is_enabled"]


class PublicProjectSerializer(serializers.ModelSerializer):
    tools = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = [
            "id", "name", "slug", "description", "brand_color", "cover_image",
            "donation_url", "donation_label",
            "start_date", "end_date", "status", "is_featured", "tools",
        ]

    def get_tools(self, obj):
        return obj.enabled_tool_keys()


class ProjectMemberSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)
    email = serializers.CharField(source="user.email", read_only=True)

    class Meta:
        model = ProjectMember
        fields = ["id", "project", "user", "username", "email", "role", "created_at"]
        read_only_fields = ["created_at"]


class ProjectAdminSerializer(serializers.ModelSerializer):
    tools = ProjectToolSerializer(many=True, read_only=True)
    members = ProjectMemberSerializer(many=True, read_only=True)
    my_role = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = [
            "id", "name", "slug", "description", "brand_color", "cover_image",
            "donation_url", "donation_label",
            "start_date", "end_date", "status", "is_active",
            "is_featured", "featured_order",
            "created_by",
            "created_at", "updated_at", "tools", "members", "my_role",
        ]
        read_only_fields = ["created_by", "created_at", "updated_at"]

    def validate_donation_url(self, value):
        if value:
            validate_https_donation_url(value)
        return value

    def get_my_role(self, obj):
        from . import services

        request = self.context.get("request")
        if not request:
            return None
        return services.user_role_in_project(request.user, obj)


class MembershipSerializer(serializers.ModelSerializer):
    """عضويات المستخدم الحالي (للوحة الأدمن الموحّدة في الواجهة)."""
    project_slug = serializers.CharField(source="project.slug", read_only=True)
    project_name = serializers.CharField(source="project.name", read_only=True)
    project_tools = serializers.SerializerMethodField()

    class Meta:
        model = ProjectMember
        fields = ["project", "project_slug", "project_name", "role", "project_tools"]

    def get_project_tools(self, obj):
        return obj.project.enabled_tool_keys()
