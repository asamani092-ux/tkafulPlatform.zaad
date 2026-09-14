"""
إدارة المستخدمين للمشرف العام — CRUD كامل + set_role / set_active.
التعقيد: list O(N) للفلترة في قاعدة البيانات وصفحة حجمها P → O(P) تسلسلاً؛ الإجراءات O(1).
"""
from django.contrib.auth.models import User
from django.db.models import Q, ProtectedError
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from core.permissions import IsAdmin
from core.activity import (
    ACTION_USER_CREATE,
    ACTION_USER_DELETE,
    ACTION_USER_SET_ACTIVE,
    ACTION_USER_SET_ROLE,
    ACTION_USER_UPDATE,
    log_activity,
)

from .admin_users import (
    MSG_LAST_ADMIN_DELETE,
    MSG_LAST_ADMIN_DISABLE,
    MSG_LAST_ADMIN_ROLE,
    MSG_SELF_DELETE,
    ROLE_VALUES,
    would_remove_last_admin,
)
from .pagination import AdminUserPagination
from .serializers import AdminUserCreateSerializer, AdminUserSerializer, AdminUserUpdateSerializer


class AdminUserViewSet(viewsets.GenericViewSet):
    permission_classes = [IsAdmin]
    pagination_class = AdminUserPagination
    serializer_class = AdminUserSerializer
    queryset = User.objects.select_related("profile").order_by("-date_joined")

    def get_queryset(self):
        qs = super().get_queryset()
        search = (self.request.query_params.get("search") or "").strip()
        role = (self.request.query_params.get("role") or "").strip()
        active = self.request.query_params.get("is_active")
        if search:
            qs = qs.filter(Q(email__icontains=search) | Q(profile__name__icontains=search))
        if role:
            qs = qs.filter(profile__role=role)
        if active in ("true", "1"):
            qs = qs.filter(is_active=True)
        elif active in ("false", "0"):
            qs = qs.filter(is_active=False)
        return qs

    def list(self, request):
        page = self.paginate_queryset(self.get_queryset())
        serializer = AdminUserSerializer(page, many=True)
        return self.get_paginated_response(serializer.data)

    def retrieve(self, request, pk=None):
        user = self.get_object()
        return Response(AdminUserSerializer(user).data)

    def create(self, request):
        serializer = AdminUserCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        log_activity(
            actor=request.user,
            action=ACTION_USER_CREATE,
            target=user,
            summary=f"إنشاء مستخدم {user.email}",
            request=request,
        )
        return Response(AdminUserSerializer(user).data, status=status.HTTP_201_CREATED)

    def partial_update(self, request, pk=None):
        user = self.get_object()
        serializer = AdminUserUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        if "role" in data and data["role"] != user.profile.role:
            if user.profile.role == "admin" and data["role"] != "admin" and would_remove_last_admin(user):
                return Response({"detail": MSG_LAST_ADMIN_ROLE}, status=status.HTTP_400_BAD_REQUEST)
            user.profile.role = data["role"]
            user.profile.save(update_fields=["role"])

        if "name" in data:
            user.profile.name = data["name"]
            user.profile.save(update_fields=["name"])

        if "city" in data:
            user.profile.city = data["city"]
            user.profile.save(update_fields=["city"])

        if "phone" in data:
            user.profile.phone = data["phone"]
            user.profile.save(update_fields=["phone"])

        if "national_id" in data:
            user.profile.national_id = data["national_id"]
            user.profile.save(update_fields=["national_id"])

        if "is_active" in data:
            if user.is_active and not data["is_active"] and would_remove_last_admin(user):
                return Response({"detail": MSG_LAST_ADMIN_DISABLE}, status=status.HTTP_400_BAD_REQUEST)
            user.is_active = data["is_active"]
            user.save(update_fields=["is_active"])

        user.refresh_from_db()
        log_activity(
            actor=request.user,
            action=ACTION_USER_UPDATE,
            target=user,
            summary=f"تعديل مستخدم {user.email}",
            request=request,
        )
        return Response(AdminUserSerializer(user).data)

    def update(self, request, pk=None):
        return self.partial_update(request, pk=pk)

    def destroy(self, request, pk=None):
        user = self.get_object()
        if user.pk == request.user.pk:
            return Response({"detail": MSG_SELF_DELETE}, status=status.HTTP_400_BAD_REQUEST)
        if would_remove_last_admin(user):
            return Response({"detail": MSG_LAST_ADMIN_DELETE}, status=status.HTTP_400_BAD_REQUEST)
        email = user.email
        try:
            user.delete()
        except ProtectedError:
            return Response(
                {"detail": "لا يمكن حذف المستخدم لارتباطه بسجلات محمية"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        log_activity(
            actor=request.user,
            action=ACTION_USER_DELETE,
            summary=f"حذف مستخدم {email}",
            request=request,
        )
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["post"], url_path="set_role")
    def set_role(self, request, pk=None):
        user = self.get_object()
        role = request.data.get("role")
        if role not in ROLE_VALUES:
            return Response({"detail": "دور غير صالح"}, status=status.HTTP_400_BAD_REQUEST)
        if user.profile.role == "admin" and role != "admin" and would_remove_last_admin(user):
            return Response({"detail": MSG_LAST_ADMIN_ROLE}, status=status.HTTP_400_BAD_REQUEST)
        user.profile.role = role
        user.profile.save(update_fields=["role"])
        log_activity(
            actor=request.user,
            action=ACTION_USER_SET_ROLE,
            target=user,
            summary=f"تعيين دور {role} للمستخدم {user.email}",
            request=request,
        )
        return Response(AdminUserSerializer(user).data)

    @action(detail=True, methods=["post"], url_path="set_active")
    def set_active(self, request, pk=None):
        user = self.get_object()
        is_active = request.data.get("is_active")
        if not isinstance(is_active, bool):
            if is_active in ("true", "1", 1, "True"):
                is_active = True
            elif is_active in ("false", "0", 0, "False"):
                is_active = False
            else:
                return Response({"detail": "is_active مطلوب"}, status=status.HTTP_400_BAD_REQUEST)
        if user.is_active and not is_active and would_remove_last_admin(user):
            return Response({"detail": MSG_LAST_ADMIN_DISABLE}, status=status.HTTP_400_BAD_REQUEST)
        user.is_active = is_active
        user.save(update_fields=["is_active"])
        log_activity(
            actor=request.user,
            action=ACTION_USER_SET_ACTIVE,
            target=user,
            summary=f"{'تفعيل' if is_active else 'تعطيل'} المستخدم {user.email}",
            request=request,
        )
        return Response(AdminUserSerializer(user).data)
