"""صلاحيات نظام الخرائط — النطاق عبر عضوية المشروع (projects.services)."""
from rest_framework.permissions import IsAuthenticated

from core.permissions import is_super_admin
from projects import services as project_services


class IsSuperAdminOrMapProjectStaff(IsAuthenticated):
    """
    لوحة إدارة الخرائط: super-admin أو عضو مشروع (النطاق النهائي في get_queryset،
    والكتابة تتحقق كائنياً في الـ ViewSets).
    """

    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False
        return is_super_admin(request.user) or bool(
            project_services.user_project_ids(request.user)
        )


def scoped_maps_queryset(user, base_qs):
    """super-admin: الكل؛ غيره: خرائط مشاريعه فقط. O(M) بعد فلترة SQL."""
    if is_super_admin(user):
        return base_qs
    return base_qs.filter(project_id__in=project_services.user_project_ids(user))
