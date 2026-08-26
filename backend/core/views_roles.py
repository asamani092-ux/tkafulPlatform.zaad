from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from core.permissions import IsAdmin
from core.roles import role_catalog


@api_view(["GET"])
@permission_classes([IsAdmin])
def role_catalog_view(request):
    """GET /api/roles/ — كتالوج الأدوار والقدرات (قراءة فقط)."""
    return Response(role_catalog())
