"""صلاحيات الخارطة: المشرف العام (role=admin) أو مسؤول المشروع (project.manager)."""
from rest_framework.permissions import IsAuthenticated

from .models import MapProject


def user_role(user):
    profile = getattr(user, "profile", None)
    return getattr(profile, "role", None) if profile else None


def is_super_admin(user):
    return bool(user and user.is_authenticated) and user_role(user) == "admin"


class IsSuperAdminOrProjectManager(IsAuthenticated):
    """
    المشرف العام يدير كل شيء؛ مسؤول المشروع يدير مشروعه فقط (ملكية على مستوى المشروع).
    التحقّق على مستوى الكائن يُنفّذ في has_object_permission.
    """

    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False
        if is_super_admin(request.user):
            return True
        # مسؤول مشروع واحد على الأقل يُسمح له بالوصول؛ التقييد الفعلي على مستوى الكائن/الاستعلام
        return MapProject.objects.filter(manager=request.user).exists()

    def has_object_permission(self, request, view, obj):
        if is_super_admin(request.user):
            return True
        project = obj if isinstance(obj, MapProject) else getattr(obj, "project", None)
        return bool(project and project.manager_id == request.user.id)
