from django.contrib.auth.models import User
from rest_framework import serializers

from .models import (
    Project, ProjectMember, ProjectTool, ProjectType,
    ProjectAllowedSupplier, ProjectAllowedRepresentative,
)
from .slug_utils import unique_slug_from_name
from .validators import validate_https_donation_url


class ProjectTypeSerializer(serializers.ModelSerializer):
    slug = serializers.SlugField(required=False, allow_blank=True, allow_unicode=True)

    class Meta:
        model = ProjectType
        fields = ["id", "name", "slug", "is_active", "order"]

    def create(self, validated_data):
        slug = (validated_data.get("slug") or "").strip()
        if not slug:
            validated_data["slug"] = unique_slug_from_name(ProjectType, validated_data.get("name", ""))
        return super().create(validated_data)

    def update(self, instance, validated_data):
        # لا نفرض على المستخدم تعديل الـ slug؛ إن أُرسل فارغاً يُتجاهل
        if "slug" in validated_data and not (validated_data.get("slug") or "").strip():
            validated_data.pop("slug")
        return super().update(instance, validated_data)



class ProjectToolSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProjectTool
        fields = ["id", "tool_key", "config", "is_enabled"]


class PublicProjectSerializer(serializers.ModelSerializer):
    tools = serializers.SerializerMethodField()
    tool_config = serializers.SerializerMethodField()
    type_name = serializers.CharField(source="type.name", read_only=True, allow_null=True)
    type_slug = serializers.CharField(source="type.slug", read_only=True, allow_null=True)

    class Meta:
        model = Project
        fields = [
            "id", "name", "slug", "description", "brand_color", "cover_image",
            "donation_url", "donation_label",
            "start_date", "end_date", "status", "is_featured", "tools", "tool_config",
            "type_name", "type_slug",
        ]

    def get_tools(self, obj):
        return obj.enabled_tool_keys()

    def get_tool_config(self, obj):
        # إعدادات الأدوات المفعّلة فقط (قيَم غير حسّاسة: مركز/مقياس/أعلام) — لعرض الهبوط
        return {t.tool_key: (t.config or {}) for t in obj.tools.all() if t.is_enabled}


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
    next_actions = serializers.SerializerMethodField()
    type_name = serializers.CharField(source="type.name", read_only=True, allow_null=True)
    type_slug = serializers.CharField(source="type.slug", read_only=True, allow_null=True)
    allowed_supplier_ids = serializers.ListField(
        child=serializers.IntegerField(), required=False, allow_empty=True
    )
    allowed_representative_ids = serializers.ListField(
        child=serializers.IntegerField(), required=False, allow_empty=True
    )
    # عند الإنشاء: اختياري — يُولَّد من الاسم إن غاب (لا يُطلب من المستخدم)
    slug = serializers.SlugField(required=False, allow_blank=True, allow_unicode=True)

    class Meta:
        model = Project
        fields = [
            "id", "name", "slug", "description", "brand_color", "cover_image",
            "donation_url", "donation_label",
            "type", "type_name", "type_slug",
            "start_date", "end_date", "status", "is_active",
            "is_featured", "featured_order",
            "created_by",
            "created_at", "updated_at", "tools", "members", "my_role",
            "next_actions",
            "allowed_supplier_ids", "allowed_representative_ids",
        ]
        read_only_fields = ["created_by", "created_at", "updated_at"]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["allowed_supplier_ids"] = list(
            instance.allowed_supplier_links.values_list("user_id", flat=True)
        )
        data["allowed_representative_ids"] = list(
            instance.allowed_representative_links.values_list("user_id", flat=True)
        )
        return data

    def _apply_allowlists(self, instance, supplier_ids, rep_ids):
        if supplier_ids is not None:
            ProjectAllowedSupplier.objects.filter(project=instance).delete()
            ProjectAllowedSupplier.objects.bulk_create(
                [ProjectAllowedSupplier(project=instance, user_id=i) for i in supplier_ids]
            )
        if rep_ids is not None:
            ProjectAllowedRepresentative.objects.filter(project=instance).delete()
            ProjectAllowedRepresentative.objects.bulk_create(
                [ProjectAllowedRepresentative(project=instance, user_id=i) for i in rep_ids]
            )

    def create(self, validated_data):
        supplier_ids = validated_data.pop("allowed_supplier_ids", None)
        rep_ids = validated_data.pop("allowed_representative_ids", None)
        slug = (validated_data.get("slug") or "").strip()
        if not slug:
            validated_data["slug"] = unique_slug_from_name(Project, validated_data.get("name", ""))
        instance = super().create(validated_data)
        self._apply_allowlists(instance, supplier_ids, rep_ids)
        return instance

    def update(self, instance, validated_data):
        supplier_ids = validated_data.pop("allowed_supplier_ids", None)
        rep_ids = validated_data.pop("allowed_representative_ids", None)
        if "slug" in validated_data and not (validated_data.get("slug") or "").strip():
            validated_data.pop("slug")
        instance = super().update(instance, validated_data)
        self._apply_allowlists(instance, supplier_ids, rep_ids)
        return instance

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

    def get_next_actions(self, obj):
        from .lifecycle import next_actions

        return next_actions(obj.status)


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
