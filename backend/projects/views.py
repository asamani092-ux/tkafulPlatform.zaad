"""
واجهات «المشاريع»:
- عامة: قائمة المشاريع النشطة + صفحة هبوط المشروع (AllowAny + cache 60s).
- أدمن: CRUD مشاريع (إنشاء/حذف super-admin فقط) + إدارة الأعضاء والأدوات.
Thin views — المنطق في services.py.
"""
from django.contrib.auth.models import User
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page

from rest_framework import status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from core.permissions import IsSuperAdmin, is_super_admin
from core.activity import ACTION_PROJECT_CREATE, ACTION_PROJECT_DELETE, log_activity
from notifications.services import notify, EVENT_PROJECT

from . import services
from .models import Project, ProjectMember, ProjectTool
from .permissions import CanManageProjectObject, IsSuperAdminOrProjectMember
from .serializers import (
    MembershipSerializer,
    ProjectAdminSerializer,
    ProjectMemberSerializer,
    ProjectToolSerializer,
    PublicProjectSerializer,
)


# ---- عام ----
@api_view(["GET"])
@permission_classes([AllowAny])
@cache_page(60)
def public_projects(request):
    """
    قائمة المشاريع العامة.
    ?home=1 → عيّنة الرئيسية (مميزة أو أحدث، حدّ افتراضي 6).
    """
    if request.query_params.get("home") in ("1", "true", "yes"):
        try:
            limit = min(max(int(request.query_params.get("limit", 6)), 1), 12)
        except (TypeError, ValueError):
            limit = 6
        qs = services.public_home_projects_queryset(limit=limit)
    else:
        qs = services.public_projects_queryset()
    return Response(PublicProjectSerializer(qs, many=True).data)


@api_view(["GET"])
@permission_classes([AllowAny])
@cache_page(60)
def public_project_detail(request, slug):
    project = (
        services.public_projects_queryset().filter(slug=slug).first()
    )
    if not project:
        return Response({"detail": "المشروع غير موجود"}, status=status.HTTP_404_NOT_FOUND)
    data = PublicProjectSerializer(project).data
    # الخرائط العامة لهذا المشروع (لصفحة الهبوط)
    from maps.services import public_maps_index

    data["maps"] = public_maps_index(project_slug=slug)
    return Response(data)


# ---- أدمن موحّد ----
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def my_memberships(request):
    """عضويات المستخدم الحالي + علم super-admin — للوحة الأدمن الموحّدة."""
    memberships = ProjectMember.objects.filter(user=request.user).select_related("project")
    return Response({
        "is_super_admin": is_super_admin(request.user),
        "memberships": MembershipSerializer(memberships, many=True).data,
    })


class ProjectViewSet(viewsets.ModelViewSet):
    serializer_class = ProjectAdminSerializer
    permission_classes = [IsSuperAdminOrProjectMember, CanManageProjectObject]

    def get_queryset(self):
        return (
            services.scoped_projects_queryset(self.request.user)
            .prefetch_related("tools", "members__user")
        )

    def create(self, request, *args, **kwargs):
        if not is_super_admin(request.user):
            return Response(
                {"detail": "إنشاء المشاريع متاح للمشرف العام فقط"},
                status=status.HTTP_403_FORBIDDEN,
            )
        response = super().create(request, *args, **kwargs)
        project = Project.objects.filter(pk=response.data.get("id")).first()
        if project:
            log_activity(
                actor=request.user,
                action=ACTION_PROJECT_CREATE,
                target=project,
                summary=f"إنشاء المشروع {project.name}",
                request=request,
            )
        return response

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        old_status = instance.status
        response = super().update(request, *args, **kwargs)
        instance.refresh_from_db()
        if instance.status != old_status:
            notify(
                message=f"تغيّرت حالة المشروع «{instance.name}» إلى {instance.status}",
                roles=["admin"],
                notification_type="info",
                link=f"/projects/{instance.slug}",
                event_type=EVENT_PROJECT,
            )
        return response

    def destroy(self, request, *args, **kwargs):
        if not is_super_admin(request.user):
            return Response(
                {"detail": "حذف المشاريع متاح للمشرف العام فقط"},
                status=status.HTTP_403_FORBIDDEN,
            )
        instance = self.get_object()
        log_activity(
            actor=request.user,
            action=ACTION_PROJECT_DELETE,
            target=instance,
            summary=f"حذف المشروع {instance.name}",
            request=request,
        )
        return super().destroy(request, *args, **kwargs)

    # ---- إدارة الأعضاء ----
    @action(detail=True, methods=["post"])
    def add_member(self, request, pk=None):
        project = self.get_object()
        if not services.can_manage_project(request.user, project):
            return Response({"detail": "غير مصرّح"}, status=status.HTTP_403_FORBIDDEN)
        user_id = request.data.get("user_id")
        role = request.data.get("role", "project_viewer")
        if role not in dict(ProjectMember.ROLE_CHOICES):
            return Response({"detail": "دور غير صالح"}, status=status.HTTP_400_BAD_REQUEST)
        user = User.objects.filter(pk=user_id).first()
        if not user:
            return Response({"detail": "المستخدم غير موجود"}, status=status.HTTP_400_BAD_REQUEST)
        member, _created = ProjectMember.objects.update_or_create(
            project=project, user=user, defaults={"role": role}
        )
        return Response(ProjectMemberSerializer(member).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    def remove_member(self, request, pk=None):
        project = self.get_object()
        if not services.can_manage_project(request.user, project):
            return Response({"detail": "غير مصرّح"}, status=status.HTTP_403_FORBIDDEN)
        deleted, _ = ProjectMember.objects.filter(
            project=project, user_id=request.data.get("user_id")
        ).delete()
        return Response({"removed": deleted})

    # ---- تفعيل/تعطيل الأدوات (provisioning للمشرف العام فقط) ----
    @action(detail=True, methods=["post"])
    def set_tool(self, request, pk=None):
        project = self.get_object()
        if not is_super_admin(request.user):
            return Response(
                {"detail": "تفعيل الأدوات متاح للمشرف العام فقط"},
                status=status.HTTP_403_FORBIDDEN,
            )
        tool_key = request.data.get("tool_key")
        if tool_key not in dict(ProjectTool.TOOL_CHOICES):
            return Response({"detail": "أداة غير معروفة"}, status=status.HTTP_400_BAD_REQUEST)
        tool, _created = ProjectTool.objects.update_or_create(
            project=project,
            tool_key=tool_key,
            defaults={
                "is_enabled": bool(request.data.get("is_enabled", True)),
                "config": request.data.get("config", {}) or {},
            },
        )
        return Response(ProjectToolSerializer(tool).data)
