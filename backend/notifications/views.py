from django.contrib.auth.models import User
from django.db.models import Case, IntegerField, Value, When
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from core.permissions import IsAdmin
from core.throttles import BroadcastRateThrottle
from core.activity import ACTION_BROADCAST, log_activity

from .models import Notification, NotificationPreference
from .serializers import NotificationPreferenceSerializer, NotificationSerializer
from .services import EVENT_BROADCAST, EVENT_TYPES, notify


class NotificationPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 50


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def my_notifications(request):
    """GET /api/notifications/ — غير المقروء أولاً ثم الأحدث."""
    qs = (
        Notification.objects.filter(user=request.user)
        .annotate(
            unread_rank=Case(
                When(status="unread", then=Value(0)),
                default=Value(1),
                output_field=IntegerField(),
            )
        )
        .order_by("unread_rank", "-created_at")
    )
    paginator = NotificationPagination()
    page = paginator.paginate_queryset(qs, request)
    return paginator.get_paginated_response(NotificationSerializer(page, many=True).data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def unread_count(request):
    count = Notification.objects.filter(user=request.user, status="unread").count()
    return Response({"count": count})


@api_view(["POST"])
@permission_classes([IsAdmin])
def send_notification(request):
    """توافق GAS: إرسال لمستخدم واحد."""
    user_id = request.data.get("user_id")
    message = request.data.get("message", "")
    if not user_id or not message:
        return Response({"detail": "user_id و message مطلوبان"}, status=status.HTTP_400_BAD_REQUEST)
    try:
        target = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response({"detail": "المستخدم غير موجود"}, status=status.HTTP_404_NOT_FOUND)
    notify(
        message=message,
        users=[target],
        notification_type=request.data.get("notification_type", "info"),
        link=request.data.get("link", ""),
        event_type=EVENT_BROADCAST,
    )
    return Response({"success": True}, status=status.HTTP_201_CREATED)


@api_view(["POST"])
@permission_classes([IsAdmin])
@throttle_classes([BroadcastRateThrottle])
def broadcast(request):
    """POST /api/notifications/broadcast/ — إلى دور أو الجميع."""
    message = (request.data.get("message") or "").strip()
    if not message:
        return Response({"detail": "الرسالة مطلوبة"}, status=status.HTTP_400_BAD_REQUEST)
    role = request.data.get("role")
    roles = [role] if role else None
    users = None
    if not role:
        users = list(User.objects.filter(is_active=True))
    n = notify(
        message=message,
        users=users,
        roles=roles,
        notification_type=request.data.get("notification_type", "info"),
        link=request.data.get("link", ""),
        event_type=EVENT_BROADCAST,
    )
    log_activity(
        actor=request.user,
        action=ACTION_BROADCAST,
        summary="بث إشعار داخل المنصّة",
        request=request,
    )
    return Response({"success": True, "sent": n}, status=status.HTTP_201_CREATED)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def mark_read(request, notification_id):
    try:
        notification = Notification.objects.get(id=notification_id, user=request.user)
    except Notification.DoesNotExist:
        return Response({"detail": "الإشعار غير موجود"}, status=status.HTTP_404_NOT_FOUND)
    notification.status = "read"
    notification.save(update_fields=["status"])
    return Response({"success": True})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def mark_all_read(request):
    Notification.objects.filter(user=request.user, status="unread").update(status="read")
    return Response({"success": True})


@api_view(["GET", "PUT"])
@permission_classes([IsAuthenticated])
def preferences(request):
    if request.method == "GET":
        stored = {
            p.event_type: p.enabled
            for p in NotificationPreference.objects.filter(user=request.user)
        }
        data = [{"event_type": t, "enabled": stored.get(t, True)} for t in EVENT_TYPES]
        return Response({"results": data})
    ser = NotificationPreferenceSerializer(data=request.data)
    ser.is_valid(raise_exception=True)
    NotificationPreference.objects.update_or_create(
        user=request.user,
        event_type=ser.validated_data["event_type"],
        defaults={"enabled": ser.validated_data["enabled"]},
    )
    return Response({"success": True})
