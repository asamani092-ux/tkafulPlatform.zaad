"""صلاحيات المشاريع — تعتمد على core.permissions و projects.services."""
from rest_framework.permissions import BasePermission, IsAuthenticated

from core.permissions import is_super_admin

from . import services


class IsSuperAdminOrProjectMember(IsAuthenticated):
    """قراءة لوحة الأدمن: super-admin أو أي عضو مشروع (النطاق يُضبط في get_queryset)."""

    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False
        return is_super_admin(request.user) or bool(services.user_project_ids(request.user))


class CanManageProjectObject(BasePermission):
    """كائنياً: إدارة المشروع لـ super-admin أو project_admin فقط."""

    def has_object_permission(self, request, view, obj):
        if request.method in ("GET", "HEAD", "OPTIONS"):
            return services.user_role_in_project(request.user, obj) is not None
        return services.can_manage_project(request.user, obj)
