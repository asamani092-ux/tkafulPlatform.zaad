"""
صلاحيات مركزية مشتركة بين التطبيقات (النسخة القانونية الوحيدة).
كانت IsAdmin مكررة في takaful_app.views و notifications.views — وُحِّدت هنا
مع إبقاء aliases في المواضع القديمة للتوافق (ثبات الواجهات).
"""
from rest_framework.permissions import IsAuthenticated

from core.roles import CAP_PLATFORM_ADMIN, has_capability


def is_super_admin(user) -> bool:
    """super-admin = القدرة platform_admin (دور admin فقط — D-06 / D-41)."""
    return has_capability(user, CAP_PLATFORM_ADMIN)


class IsAdmin(IsAuthenticated):
    """مشرف عام (super-admin) — profile.role == 'admin'."""

    def has_permission(self, request, view):
        return super().has_permission(request, view) and is_super_admin(request.user)


# مرادف صريح للاستخدام في سياق المنصّة الموحّدة
IsSuperAdmin = IsAdmin
