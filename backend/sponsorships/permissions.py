"""صلاحيات وحدة كفالات السقيا حسب الدور (تعتمد accounts.Profile.role عبر ROLE_CAPABILITIES)."""
from rest_framework.permissions import BasePermission, SAFE_METHODS

from core.roles import (
    CAP_APPROVE_SPONSORSHIP,
    CAP_CREATE_SPONSORSHIP,
    has_capability,
    role_of,
)


def _role(user):
    return role_of(user)


class IsSaqyaAdmin(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and has_capability(request.user, CAP_APPROVE_SPONSORSHIP))


class IsDonor(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and has_capability(request.user, CAP_CREATE_SPONSORSHIP))


class IsSupplier(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and role_of(request.user) == "supplier")


class IsRepresentative(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and role_of(request.user) == "representative")


class IsSaqyaStaffOrReadOnly(BasePermission):
    """قراءة لأي مصادق، كتابة للمشرف فقط (لإدارة الموردين/المندوبين)."""
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.method in SAFE_METHODS:
            return True
        return has_capability(request.user, CAP_APPROVE_SPONSORSHIP)
