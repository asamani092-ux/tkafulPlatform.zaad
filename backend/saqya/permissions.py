"""صلاحيات وحدة كفالات السقيا حسب الدور (تعتمد accounts.Profile.role)."""
from rest_framework.permissions import BasePermission, SAFE_METHODS


def _role(user):
    return getattr(getattr(user, "profile", None), "role", None)


class IsSaqyaAdmin(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and _role(request.user) == "admin")


class IsDonor(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and _role(request.user) == "donor")


class IsSupplier(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and _role(request.user) == "supplier")


class IsRepresentative(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and _role(request.user) == "representative")


class IsSaqyaStaffOrReadOnly(BasePermission):
    """قراءة لأي مصادق، كتابة للمشرف فقط (لإدارة الموردين/المندوبين)."""
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.method in SAFE_METHODS:
            return True
        return _role(request.user) == "admin"
