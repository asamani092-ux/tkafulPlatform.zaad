from django.core.exceptions import ValidationError as DjangoValidationError
from django.views.decorators.cache import cache_page
from rest_framework import status, viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import serializers

from core.permissions import IsAdmin
from core.models import PlatformSetting, StaticPage
from core.platform_settings import apply_settings_patch, public_payload, settings_to_dict
from core.activity import ACTION_SETTINGS_CHANGE, ACTION_STATIC_PAGE_PUBLISH, log_activity


class StaticPageSerializer(serializers.ModelSerializer):
    class Meta:
        model = StaticPage
        fields = ["id", "slug", "title", "body", "is_published", "updated_at"]
        read_only_fields = ["id", "updated_at"]


@api_view(["GET"])
@permission_classes([AllowAny])
@cache_page(60)
def public_platform_settings(request):
    """GET /api/public-settings/ — حقول عامة آمنة فقط."""
    return Response(public_payload())


@api_view(["GET", "PATCH"])
@permission_classes([IsAdmin])
def admin_platform_settings(request):
    """GET/PATCH /api/settings/ — مشرف عام."""
    if request.method == "GET":
        return Response(settings_to_dict(PlatformSetting.load()))
    try:
        obj = apply_settings_patch(request.data or {})
    except DjangoValidationError as exc:
        if getattr(exc, "message_dict", None):
            return Response(exc.message_dict, status=status.HTTP_400_BAD_REQUEST)
        msgs = getattr(exc, "messages", None) or [str(exc)]
        return Response({"detail": msgs}, status=status.HTTP_400_BAD_REQUEST)
    log_activity(
        actor=request.user,
        action=ACTION_SETTINGS_CHANGE,
        target=obj,
        summary="تعديل إعدادات المنصّة",
        request=request,
    )
    return Response(settings_to_dict(obj))


class StaticPageViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdmin]
    serializer_class = StaticPageSerializer
    queryset = StaticPage.objects.all()
    lookup_field = "slug"

    def perform_create(self, serializer):
        serializer.save()
        if serializer.instance.is_published:
            log_activity(
                actor=self.request.user,
                action=ACTION_STATIC_PAGE_PUBLISH,
                target=serializer.instance,
                summary=f"نشر صفحة {serializer.instance.slug}",
                request=self.request,
            )

    def perform_update(self, serializer):
        previous = self.get_object()
        was_published = previous.is_published
        serializer.save()
        if serializer.instance.is_published and not was_published:
            log_activity(
                actor=self.request.user,
                action=ACTION_STATIC_PAGE_PUBLISH,
                target=serializer.instance,
                summary=f"نشر صفحة {serializer.instance.slug}",
                request=self.request,
            )
