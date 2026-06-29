from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.contrib.auth.models import User

from .models import Notification
from .serializers import NotificationSerializer


class IsAdmin(IsAuthenticated):
    def has_permission(self, request, view):
        return (
            super().has_permission(request, view) and
            hasattr(request.user, "profile") and
            request.user.profile.role == "admin"
        )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def my_notifications(request):
    """
    GET /api/notifications/
    إشعارات المستخدم الحالي (الأحدث أولاً) — يطابق getNotifications في GAS.
    """
    qs = Notification.objects.filter(user=request.user)
    return Response({"results": NotificationSerializer(qs, many=True).data})


@api_view(["POST"])
@permission_classes([IsAdmin])
def send_notification(request):
    """
    POST /api/notifications/send/
    Body: { "user_id": <int>, "message": "..." }
    يرسل إشعاراً لمستخدم — يطابق sendUserNotification في GAS.
    """
    user_id = request.data.get("user_id")
    message = request.data.get("message", "")

    if not user_id or not message:
        return Response(
            {"detail": "user_id و message مطلوبان"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        target = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response({"detail": "المستخدم غير موجود"}, status=status.HTTP_404_NOT_FOUND)

    notification = Notification.objects.create(user=target, message=message)
    return Response(
        {"success": True, "id": notification.id, "notification": NotificationSerializer(notification).data},
        status=status.HTTP_201_CREATED,
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def mark_read(request, notification_id):
    """
    POST /api/notifications/<id>/read/
    تعليم إشعار المستخدم الحالي كمقروء.
    """
    try:
        notification = Notification.objects.get(id=notification_id, user=request.user)
    except Notification.DoesNotExist:
        return Response({"detail": "الإشعار غير موجود"}, status=status.HTTP_404_NOT_FOUND)

    notification.status = "read"
    notification.save(update_fields=["status"])
    return Response({"success": True})
