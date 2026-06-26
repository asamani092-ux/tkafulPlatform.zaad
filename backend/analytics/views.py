from rest_framework import viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated, SAFE_METHODS, BasePermission

from .models import Employee, DashboardSection, DashboardKpi, StaffTask
from .serializers import (
    EmployeeSerializer, DashboardSectionSerializer,
    DashboardKpiSerializer, StaffTaskSerializer,
)


class IsAdminOrReadOnly(BasePermission):
    """
    القراءة متاحة للجميع (اللوحة التنفيذية عامة في المشروع الثاني).
    الكتابة (saveSection/saveEmployee/saveTask) تتطلّب أدمن مصادقاً.
    """
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        user = request.user
        return bool(
            user and user.is_authenticated and
            hasattr(user, "profile") and user.profile.role == "admin"
        )


@api_view(["GET"])
@permission_classes([AllowAny])
def executive_dashboard(request):
    """
    GET /api/dashboard/executive/
    يعيد بيانات اللوحة التنفيذية الموحّدة (يطابق getDashboardData في المشروع الثاني GAS).
    عام — لا يتطلّب مصادقة.
    """
    return Response({
        "sections": DashboardSectionSerializer(
            DashboardSection.objects.all(), many=True
        ).data,
        "employees": EmployeeSerializer(
            Employee.objects.filter(is_active=True), many=True
        ).data,
        "tasks": StaffTaskSerializer(
            StaffTask.objects.select_related("employee", "project").all(), many=True
        ).data,
        "kpis": DashboardKpiSerializer(
            DashboardKpi.objects.all(), many=True
        ).data,
    })


class EmployeeViewSet(viewsets.ModelViewSet):
    queryset = Employee.objects.all()
    serializer_class = EmployeeSerializer
    permission_classes = [IsAdminOrReadOnly]


class DashboardSectionViewSet(viewsets.ModelViewSet):
    queryset = DashboardSection.objects.all()
    serializer_class = DashboardSectionSerializer
    permission_classes = [IsAdminOrReadOnly]


class DashboardKpiViewSet(viewsets.ModelViewSet):
    queryset = DashboardKpi.objects.all()
    serializer_class = DashboardKpiSerializer
    permission_classes = [IsAdminOrReadOnly]


class StaffTaskViewSet(viewsets.ModelViewSet):
    queryset = StaffTask.objects.select_related("employee", "project").all()
    serializer_class = StaffTaskSerializer
    permission_classes = [IsAdminOrReadOnly]
