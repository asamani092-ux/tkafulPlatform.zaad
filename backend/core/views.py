from django.conf import settings
from django.http import Http404
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response


@api_view(["GET"])
@permission_classes([AllowAny])
def ping(request):
    return Response({"message": "Takaful backend is working"})


@api_view(["GET"])
@permission_classes([AllowAny])
def uat_status(request):
    """Returns 404 when UAT is disabled (default); {"enabled": true} when UAT_ENABLED."""
    if not getattr(settings, "UAT_ENABLED", False):
        raise Http404
    return Response({"enabled": True})
