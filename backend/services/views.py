"""Services API views (moved from volunteering — Phase 1 API ownership)."""
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes, throttle_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny

from core.permissions import IsAdmin
from core.throttles import PublicWriteRateThrottle

from .models import Service, ServiceRequest, ServiceVolunteerApplication, Suggestion, WaterSupplyRequest
from .serializers import (
    ServiceSerializer,
    ServiceRequestSerializer,
    ServiceVolunteerApplicationSerializer,
    SuggestionSerializer,
    WaterSupplyRequestSerializer,
)


class ServiceViewSet(viewsets.ModelViewSet):
    """
    Admin endpoint for managing services
    GET /api/services/ - List all services
    POST /api/services/ - Create new service
    """
    queryset = Service.objects.all()
    serializer_class = ServiceSerializer
    permission_classes = [IsAdmin]


class ServiceRequestViewSet(viewsets.ModelViewSet):
    """
    Admin endpoint for managing service requests
    GET /api/service-requests/ - List all service requests
    GET /api/service-requests/?status=PENDING - Filter by status
    """
    queryset = ServiceRequest.objects.all()
    serializer_class = ServiceRequestSerializer
    permission_classes = [IsAdmin]

    def get_queryset(self):
        queryset = super().get_queryset().select_related('service')

        status_param = self.request.query_params.get('status')
        if status_param:
            queryset = queryset.filter(status=status_param)

        return queryset.order_by('-created_at')

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """
        POST /api/service-requests/{id}/approve/
        Approve a service request
        """
        service_request = self.get_object()

        if service_request.status != 'PENDING':
            return Response(
                {"error": "Only pending requests can be approved"},
                status=status.HTTP_400_BAD_REQUEST
            )

        service_request.status = 'APPROVED'
        service_request.save()

        serializer = self.get_serializer(service_request)
        return Response({
            "message": "تم قبول طلب الخدمة بنجاح",
            "request": serializer.data
        })

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """
        POST /api/service-requests/{id}/reject/
        Reject a service request
        """
        service_request = self.get_object()

        if service_request.status != 'PENDING':
            return Response(
                {"error": "Only pending requests can be rejected"},
                status=status.HTTP_400_BAD_REQUEST
            )

        service_request.status = 'REJECTED'
        service_request.save()

        serializer = self.get_serializer(service_request)
        return Response({
            "message": "تم رفض طلب الخدمة",
            "request": serializer.data
        })

    @action(detail=True, methods=['post'])
    def mark_done(self, request, pk=None):
        """
        POST /api/service-requests/{id}/mark_done/
        Mark a service request as done
        """
        service_request = self.get_object()

        if service_request.status not in ['PENDING', 'APPROVED']:
            return Response(
                {"error": "Cannot mark this request as done"},
                status=status.HTTP_400_BAD_REQUEST
            )

        service_request.status = 'DONE'
        service_request.save()

        serializer = self.get_serializer(service_request)
        return Response({
            "message": "تم وضع علامة على الطلب كمكتمل",
            "request": serializer.data
        })


class SuggestionViewSet(viewsets.ModelViewSet):
    queryset = Suggestion.objects.all()
    serializer_class = SuggestionSerializer

    def get_permissions(self):
        if self.action == "create":
            return [AllowAny()]
        return [IsAdmin()]

    def get_throttles(self):
        if self.action == "create":
            return [PublicWriteRateThrottle()]
        return super().get_throttles()


class WaterSupplyRequestViewSet(viewsets.ReadOnlyModelViewSet):
    """قائمة/تفاصيل طلبات سقيا الماء لنطاق الطلبات في لوحة الإدارة (Phase B)."""
    queryset = WaterSupplyRequest.objects.select_related("project").all()
    serializer_class = WaterSupplyRequestSerializer
    permission_classes = [IsAdmin]


@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([PublicWriteRateThrottle])
def public_submit_suggestion(request):
    """
    POST /api/public-suggestions/
    Submit a suggestion from the public suggest page
    No authentication required
    """
    serializer = SuggestionSerializer(data=request.data)

    if serializer.is_valid():
        serializer.save()
        return Response({
            'message': 'تم استلام اقتراحك بنجاح'
        }, status=status.HTTP_201_CREATED)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([PublicWriteRateThrottle])
def public_submit_service_request(request):
    """
    POST /api/public-service-request/
    Submit a service request from the public (beneficiaries)
    No authentication required
    """
    serializer = ServiceRequestSerializer(data=request.data)

    if serializer.is_valid():
        serializer.save()
        return Response({
            'message': 'تم استلام طلبك بنجاح. سيتم مراجعته من قبل الإدارة.',
            'request_id': serializer.data['id']
        }, status=status.HTTP_201_CREATED)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([AllowAny])
def public_services_list(request):
    """
    GET /api/public-services/
    List all active VOLUNTEER OPPORTUNITY services for /services page
    No authentication required
    """
    services = Service.objects.filter(
        is_active=True,
        service_type="للمتطوعين"
    ).order_by('-created_at')
    serializer = ServiceSerializer(services, many=True)
    return Response({
        'results': serializer.data
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def beneficiary_services_list(request):
    """
    GET /api/beneficiary-services/
    List all active BENEFICIARY services for main page
    No authentication required
    """
    services = Service.objects.filter(
        is_active=True,
        service_type="للمستفيدين"
    ).order_by('-created_at')
    serializer = ServiceSerializer(services, many=True)
    return Response({
        'results': serializer.data
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def apply_to_service_as_volunteer(request, service_id):
    """
    POST /api/services/{service_id}/apply-volunteer/
    Apply to help with a service as a volunteer
    Requires authentication
    """
    try:
        service = Service.objects.get(id=service_id)
        user = request.user

        existing_application = ServiceVolunteerApplication.objects.filter(
            service=service,
            volunteer=user
        ).first()

        if existing_application:
            return Response(
                {'message': 'لقد تقدمت للمساعدة في هذه الخدمة من قبل'},
                status=status.HTTP_400_BAD_REQUEST
            )

        application = ServiceVolunteerApplication.objects.create(
            volunteer=user,
            service=service,
            message=request.data.get('message', ''),
            status='قيد المراجعة'
        )

        return Response({
            'message': 'تم إرسال طلبك للمساعدة بنجاح. سيتم مراجعته من قبل المشرف.',
            'application_id': application.id
        })

    except Service.DoesNotExist:
        return Response(
            {'error': 'الخدمة غير موجودة'},
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(['GET'])
@permission_classes([IsAdmin])
def list_service_volunteer_applications(request):
    """
    GET /api/admin/service-volunteer-applications/
    List all volunteer applications for services with optional status filter
    """
    status_filter = request.query_params.get('status', None)

    applications = ServiceVolunteerApplication.objects.select_related(
        'volunteer__profile', 'service', 'reviewed_by__profile'
    ).all()

    if status_filter:
        applications = applications.filter(status=status_filter)

    serializer = ServiceVolunteerApplicationSerializer(applications, many=True)
    return Response({'results': serializer.data})


@api_view(['POST'])
@permission_classes([IsAdmin])
def accept_service_volunteer_application(request, application_id):
    """
    POST /api/admin/service-volunteer-applications/{application_id}/accept/
    Accept a volunteer application for a service
    """
    try:
        application = ServiceVolunteerApplication.objects.get(id=application_id)

        if application.status != 'قيد المراجعة':
            return Response(
                {'error': 'هذا الطلب تم مراجعته بالفعل'},
                status=status.HTTP_400_BAD_REQUEST
            )

        application.status = 'مقبول'
        application.reviewed_by = request.user
        application.reviewed_at = timezone.now()
        application.admin_notes = request.data.get('admin_notes', '')
        application.save()

        return Response({
            'message': 'تم قبول المتطوع للمساعدة في الخدمة'
        })

    except ServiceVolunteerApplication.DoesNotExist:
        return Response(
            {'error': 'الطلب غير موجود'},
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(['POST'])
@permission_classes([IsAdmin])
def reject_service_volunteer_application(request, application_id):
    """
    POST /api/admin/service-volunteer-applications/{application_id}/reject/
    Reject a volunteer application for a service
    """
    try:
        application = ServiceVolunteerApplication.objects.get(id=application_id)

        if application.status != 'قيد المراجعة':
            return Response(
                {'error': 'هذا الطلب تم مراجعته بالفعل'},
                status=status.HTTP_400_BAD_REQUEST
            )

        application.status = 'مرفوض'
        application.reviewed_by = request.user
        application.reviewed_at = timezone.now()
        application.admin_notes = request.data.get('admin_notes', '')
        application.save()

        return Response({
            'message': 'تم رفض الطلب'
        })

    except ServiceVolunteerApplication.DoesNotExist:
        return Response(
            {'error': 'الطلب غير موجود'},
            status=status.HTTP_404_NOT_FOUND
        )


def _resolve_water_supply_project(request):
    """Resolve optional project from POST body or query (slug or numeric id)."""
    from projects.models import Project

    ref = request.data.get("project")
    if ref is None or ref == "":
        ref = request.query_params.get("project")
    if ref is None or ref == "":
        return None

    if isinstance(ref, int) or (isinstance(ref, str) and ref.isdigit()):
        return Project.objects.filter(pk=int(ref)).first()
    return Project.objects.filter(slug=str(ref)).first()


@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([PublicWriteRateThrottle])
def public_water_supply_request(request):
    """
    POST /api/public-water-supply-request/
    Submit a water supply request for a mosque.
    Optional `project` (slug or id) in body or query links the request to a Project.
    No authentication required (public form — see PERMISSION_TABLE.md).
    """
    data = request.data.copy()

    field_mapping = {
        'applicantName': 'applicant_name',
        'mobileNumber': 'mobile_number',
        'applicantRole': 'applicant_role',
        'mosqueName': 'mosque_name',
        'neighborhood': 'neighborhood',
        'locationLink': 'location_link',
        'worshippersCount': 'worshippers_count',
        'donorExists': 'donor_exists',
        'donorName': 'donor_name',
        'donorPhone': 'donor_phone',
    }

    mapped_data = {}
    for frontend_key, backend_key in field_mapping.items():
        if frontend_key in data:
            value = data[frontend_key]
            if frontend_key == 'donorExists':
                value = value == 'نعم'
            elif frontend_key == 'worshippersCount':
                try:
                    value = int(value)
                except (ValueError, TypeError):
                    value = 0
            mapped_data[backend_key] = value

    project = _resolve_water_supply_project(request)
    if project is not None:
        mapped_data['project'] = project.id

    serializer = WaterSupplyRequestSerializer(data=mapped_data)
    if serializer.is_valid():
        serializer.save()
        return Response({
            'success': True,
            'message': 'تم إرسال طلبك بنجاح'
        }, status=status.HTTP_201_CREATED)

    return Response({
        'success': False,
        'errors': serializer.errors
    }, status=status.HTTP_400_BAD_REQUEST)
