"""
حراسة إدارة المستخدمين — عدّ المشرفين النشطين وحماية آخر مشرف.
التعقيد: active_admin_count O(1) عبر COUNT؛ الحراسة O(1).
"""
from django.contrib.auth.models import User

from .models import Profile

ROLE_VALUES = {choice[0] for choice in Profile.ROLE_CHOICES}

MSG_SELF_DELETE = "لا يمكنك حذف حسابك"
MSG_LAST_ADMIN_DELETE = "لا يمكن حذف آخر مشرف في المنصّة"
MSG_LAST_ADMIN_ROLE = "لا يمكن تغيير دور آخر مشرف في المنصّة"
MSG_LAST_ADMIN_DISABLE = "لا يمكن تعطيل آخر مشرف في المنصّة"
MSG_INVALID_ROLE = "دور غير صالح"


def active_admin_qs():
    return User.objects.filter(is_active=True, profile__role="admin")


def active_admin_count() -> int:
    return active_admin_qs().count()


def is_active_admin(user: User) -> bool:
    return bool(
        user.is_active
        and hasattr(user, "profile")
        and user.profile.role == "admin"
    )


def would_remove_last_admin(user: User) -> bool:
    """True إن كان حذف/تعطيل/تنزيل هذا المستخدم يترك المنصّة بلا مشرف نشط."""
    return is_active_admin(user) and active_admin_count() <= 1
