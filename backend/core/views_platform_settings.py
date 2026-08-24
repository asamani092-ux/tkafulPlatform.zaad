from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from core.permissions import IsSuperAdmin
from core.platform_settings import get_settings_dict, patch_settings


@api_view(["GET"])
@permission_classes([AllowAny])
def public_platform_settings(request):
    """
    GET /api/platform/public-settings/
    أعلام ونصوص عامة للواجهة — بدون مصادقة.
    """
    return Response(get_settings_dict(public_only=True))


@api_view(["GET", "PATCH"])
@permission_classes([IsSuperAdmin])
def admin_platform_settings(request):
    """
    GET/PATCH /api/platform/settings/
    قراءة/تحديث إعدادات المنصّة — مشرف عام فقط.
  """
    if request.method == "GET":
        return Response(get_settings_dict())

    updated = patch_settings(request.data or {}, request.user)
    return Response(updated)
