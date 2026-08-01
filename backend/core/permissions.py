"""
صلاحيات مركزية مشتركة بين التطبيقات (النسخة القانونية الوحيدة).
كانت IsAdmin مكررة في takaful_app.views و notifications.views — وُحِّدت هنا
مع إبقاء aliases في المواضع القديمة للتوافق (ثبات الواجهات).
"""
from rest_framework.permissions import IsAuthenticated


def is_super_admin(user) -> bool:
    """super-admin = الدور العالمي admin في accounts.Profile (بدون أدوار جديدة — D-06)."""
    return bool(
        user
        and user.is_authenticated
        and hasattr(user, "profile")
        and user.profile.role == "admin"
    )


class IsAdmin(IsAuthenticated):
    """مشرف عام (super-admin) — profile.role == 'admin'."""

    def has_permission(self, request, view):
        return super().has_permission(request, view) and is_super_admin(request.user)


# مرادف صريح للاستخدام في سياق المنصّة الموحّدة
IsSuperAdmin = IsAdmin
