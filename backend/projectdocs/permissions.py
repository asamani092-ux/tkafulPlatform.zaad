from rest_framework.permissions import BasePermission, SAFE_METHODS

from core.permissions import IsAdmin, is_super_admin
from .services import can_edit_dossier


class CanManageDossier(BasePermission):
    """مشرف أو مدير الملف المعيَّن."""

    def has_object_permission(self, request, view, obj):
        dossier = obj if hasattr(obj, "manager_id") else getattr(obj, "dossier", None)
        if dossier is None:
            return False
        if request.method in SAFE_METHODS:
            return can_edit_dossier(request.user, dossier) or is_super_admin(request.user)
        return can_edit_dossier(request.user, dossier)


IsDossierAdmin = IsAdmin
