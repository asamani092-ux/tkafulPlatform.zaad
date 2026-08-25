import logging

from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from notifications.services import notify, EVENT_VOLUNTEER

logger = logging.getLogger(__name__)
from django.contrib.auth.models import User
from django.db.models import Sum, Count, Q
from django.utils import timezone

from .models import (
    VolunteeringProfile, Volunteer,
    ProjectAssignment, Task, Subtask, VolunteerApplication,
)
from . import project_helpers
from .serializers import (
    ProjectSerializer, ProjectAssignmentSerializer,
    TaskSerializer, SubtaskSerializer, VolunteerDetailSerializer,
    VolunteerRequestSerializer, VolunteerApplicationSerializer,
)


# الصلاحية المركزية الموحّدة (D-11) — الاسم باقٍ للتوافق مع الاستيرادات القديمة
from core.permissions import IsAdmin  # noqa: E402


# ============================================================================
# ADMIN STATISTICS ENDPOINTS
# ============================================================================
@api_view(['GET'])
@permission_classes([IsAdmin])
def admin_stats(request):
    """
    GET /api/admin/stats/
    Returns aggregated statistics for admin dashboard (main.tsx)
    """
    active_projects_count = VolunteeringProfile.objects.filter(volunteer_status='ACTIVE').count()
    completed_projects_count = VolunteeringProfile.objects.filter(volunteer_status='COMPLETED').count()
    total_projects_count = VolunteeringProfile.objects.count()

    total_donations = project_helpers.aggregate_donations()

    total_beneficiaries = project_helpers.aggregate_beneficiaries()
    
    return Response({
        'total_donations': float(total_donations),
        'total_beneficiaries': total_beneficiaries,
        'active_projects': active_projects_count,
        'completed_projects': completed_projects_count,
        'total_projects': total_projects_count,
    })


@api_view(['GET'])
@permission_classes([IsAdmin])
def volunteer_stats(request):
    """
    GET /api/admin/volunteer-stats/
    Returns volunteer statistics for VolunteerManagement page
    """
    # ✅ UPDATED: Count only APPROVED volunteers
    total_volunteers = User.objects.filter(
        profile__role='user',
        profile__is_approved=True
    ).count()
    
    # Active volunteers: those with current tasks
    active_volunteers = User.objects.filter(
        profile__role='user',
        profile__is_approved=True,
        assigned_tasks__status__in=['قيد التنفيذ', 'في الانتظار']
    ).distinct().count()
    
    # Total volunteer hours (only approved)
    total_hours = User.objects.filter(
        profile__role='user',
        profile__is_approved=True
    ).aggregate(
        total=Sum('profile__total_volunteer_hours')
    )['total'] or 0
    
    # Completed tasks
    completed_tasks = Task.objects.filter(status='مكتملة').count()
    
    return Response({
        'total_volunteers': total_volunteers,
        'active_volunteers': active_volunteers,
        'total_hours': total_hours,
        'completed_tasks': completed_tasks,
    })


@api_view(['GET'])
@permission_classes([IsAdmin])
def get_my_active_project(request):
    """
    GET /api/admin/my-active-project/?status=ACTIVE&project_id=123
    Returns a project for viewing/editing in the bottom section of main page

    Query Parameters:
    - status: Filter by status (ACTIVE, PLANNED, COMPLETED, CANCELLED)
              The dropdown menu uses this to SELECT which project to display
    - project_id: Return a specific project by ID

    Independent from top tabs section - used for filtering projects in bottom section
    """
    try:
        project_id = request.query_params.get('project_id')
        status_filter = request.query_params.get('status')

        # Status mapping from Arabic to English
        status_map = {
            'نشط': 'ACTIVE',
            'متوقف': 'PLANNED',
            'مكتمل': 'COMPLETED',
            'ملغي': 'CANCELLED'
        }

        # If specific project requested, return it (highest priority)
        if project_id:
            try:
                profile = project_helpers.profile_for_project_id(project_id)
                if profile:
                    serializer = ProjectSerializer(profile)
                    return Response(serializer.data)
            except VolunteeringProfile.DoesNotExist:
                pass

        # If status filter provided, return most recent project with that status
        if status_filter:
            english_status = status_map.get(status_filter, status_filter)

            profile = VolunteeringProfile.objects.filter(
                volunteer_status=english_status
            ).select_related("project").order_by('-updated_at').first()

            if profile:
                serializer = ProjectSerializer(profile)
                return Response(serializer.data)
            else:
                return Response(None, status=200)

        profile = VolunteeringProfile.objects.filter(
            volunteer_status='ACTIVE'
        ).select_related("project").order_by('-updated_at').first()

        if not profile:
            profile = VolunteeringProfile.objects.select_related("project").order_by('-updated_at').first()

        if profile:
            serializer = ProjectSerializer(profile)
            return Response(serializer.data)

        # Return null only if there are absolutely no projects
        return Response(None, status=200)

    except Exception as e:
        return Response({'error': str(e)}, status=500)


# ============================================================================
# PROJECT VIEWSET (Enhanced) - CORRECTED VERSION
# ============================================================================
class VolunteeringProfileViewSet(viewsets.ModelViewSet):
    """
    Admin endpoint for managing volunteering projects (VolunteeringProfile).
    URL pk = platform Project.id for backward compatibility.
    """
    queryset = project_helpers.volunteering_profiles_qs()
    serializer_class = ProjectSerializer
    permission_classes = [IsAdmin]
    pagination_class = None

    STATUS_MAPPING = {
        'نشط': 'ACTIVE',
        'متوقف': 'PLANNED',
        'مكتمل': 'COMPLETED',
        'ملغي': 'CANCELLED',
        'حالة المشروع': 'PLANNED',
    }

    def get_object(self):
        return project_helpers.profile_for_project_id(self.kwargs["pk"])

    def get_queryset(self):
        queryset = super().get_queryset()
        status_param = self.request.query_params.get('status', None)

        if status_param == 'pending':
            queryset = queryset.filter(volunteer_status='PLANNED')
        elif status_param == 'active':
            queryset = queryset.filter(volunteer_status='ACTIVE')
        elif status_param == 'completed':
            queryset = queryset.filter(volunteer_status='COMPLETED')

        return queryset.order_by('-created_at')

    def create(self, request, *args, **kwargs):
        """
        Create a new project - automatically set status to ACTIVE
        Projects created by admin should be active by default, not pending
        """
        data = request.data.copy() if hasattr(request.data, 'copy') else dict(request.data)

        # Set status to ACTIVE by default for admin-created projects
        if 'status' not in data:
            data['status'] = 'ACTIVE'

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)

        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def update(self, request, *args, **kwargs):
        """Handle full updates (PUT)"""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()

        # Make a mutable copy of the data
        data = request.data.copy() if hasattr(request.data, 'copy') else dict(request.data)

        # Handle status mapping from Arabic to English
        if 'status' in data:
            arabic_status = data['status']
            english_status = self.STATUS_MAPPING.get(arabic_status, arabic_status)
            data['status'] = english_status

        # Serialize and save
        serializer = self.get_serializer(instance, data=data, partial=True)

        # Add detailed error logging
        if not serializer.is_valid():
            logger.warning("Project %s update validation failed: %s", instance.id, serializer.errors)

        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        # Return updated data (status_display is automatically added by serializer)
        return Response(serializer.data)
    
    def partial_update(self, request, *args, **kwargs):
        """Handle partial updates (PATCH)"""
        kwargs['partial'] = True
        return self.update(request, *args, **kwargs)
    
    @action(detail=True, methods=['post'])
    def assign_volunteer(self, request, pk=None):
        project = self.get_object()
        user_id = request.data.get('user_id')
        
        if not user_id:
            return Response(
                {"error": "user_id is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response(
                {"error": "User not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        assignment, created = ProjectAssignment.objects.get_or_create(
            project=project.project,
            user=user,
            defaults={'status': 'جديدة'}
        )
        
        if not created:
            return Response(
                {"error": "User already assigned to this project"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = ProjectAssignmentSerializer(assignment)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """
        Approve a pending project idea - changes status from PLANNED to ACTIVE
        POST /api/admin/projects/{id}/approve/
        """
        profile = self.get_object()

        if profile.volunteer_status != 'PLANNED':
            return Response(
                {"error": "Only pending projects can be approved"},
                status=status.HTTP_400_BAD_REQUEST
            )

        old_status = profile.volunteer_status
        profile.volunteer_status = 'ACTIVE'
        profile.project.status = 'active'
        profile.project.save()
        profile.save()

        logger.info("Project %s approved: %s -> ACTIVE", profile.project.id, old_status)

        serializer = self.get_serializer(profile)
        return Response({
            "message": "Project approved successfully",
            "project": serializer.data
        })
    
    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        profile = self.get_object()
        
        if profile.volunteer_status != 'PLANNED':
            return Response(
                {"error": "Only pending projects can be rejected"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        project_title = profile.project.name
        profile.project.delete()
        
        return Response({
            "message": f"Project '{project_title}' rejected successfully"
        })


# ============================================================================
# TASK VIEWSET
# ============================================================================
class TaskViewSet(viewsets.ModelViewSet):
    """
    Admin endpoint for managing tasks
    GET /api/admin/tasks/ - List all tasks
    POST /api/admin/tasks/ - Create new task
    PUT /api/admin/tasks/{id}/ - Update task (including subtasks)
    """
    queryset = Task.objects.all()
    serializer_class = TaskSerializer
    permission_classes = [IsAdmin]
    
    def get_queryset(self):
        queryset = super().get_queryset().select_related('project', 'volunteer__profile')
        
        # Filter by volunteer
        volunteer_id = self.request.query_params.get('volunteer_id')
        if volunteer_id:
            queryset = queryset.filter(volunteer_id=volunteer_id)
        
        # Filter by project
        project_id = self.request.query_params.get('project_id')
        if project_id:
            queryset = queryset.filter(project_id=project_id)
        
        # Filter by status
        task_status = self.request.query_params.get('status')
        if task_status:
            queryset = queryset.filter(status=task_status)
        
        return queryset
    
    @action(detail=True, methods=['post'])
    def assign(self, request, pk=None):
        """
        POST /api/admin/tasks/{id}/assign/
        Body: { "volunteer_id": 1 }
        Assign a task to a volunteer
        """
        task = self.get_object()
        volunteer_id = request.data.get('volunteer_id')
        
        if not volunteer_id:
            return Response(
                {"error": "volunteer_id is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            volunteer = User.objects.get(id=volunteer_id)
        except User.DoesNotExist:
            return Response(
                {"error": "Volunteer not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        task.volunteer = volunteer
        if task.status == 'في الانتظار':
            task.status = 'قيد التنفيذ'
        task.save()
        
        serializer = self.get_serializer(task)
        return Response({
            "message": "Task assigned successfully",
            "task": serializer.data
        })


# ============================================================================
# VOLUNTEER MANAGEMENT ENDPOINTS
# ============================================================================
@api_view(['GET'])
@permission_classes([IsAdmin])
def list_volunteers(request):
    """
    GET /api/admin/volunteers/
    Returns detailed list of APPROVED volunteers for VolunteerManagement page
    """
    # ✅ UPDATED: Only show approved volunteers
    volunteers = User.objects.filter(
        profile__role='user',
        profile__is_approved=True
    ).select_related('profile').prefetch_related('assigned_tasks')

    # ترقيم اختياري للقوائم الكبيرة (لا يغيّر السلوك الافتراضي عند عدم تمرير page)
    if request.query_params.get('page'):
        from rest_framework.pagination import PageNumberPagination
        paginator = PageNumberPagination()
        try:
            paginator.page_size = min(int(request.query_params.get('page_size', 50)), 200)
        except (TypeError, ValueError):
            paginator.page_size = 50
        page = paginator.paginate_queryset(volunteers, request)
        serializer = VolunteerDetailSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)

    serializer = VolunteerDetailSerializer(volunteers, many=True)
    return Response({
        'results': serializer.data
    })


@api_view(['GET'])
@permission_classes([IsAdmin])
def volunteer_requests_list(request):
    """
    GET /api/admin/volunteer-requests/?limit=4
    Returns list of PENDING volunteer approval requests
    For VolunteerRequests.tsx page and admin main page
    """
    # ✅ UPDATED: Only show pending (not approved) volunteers
    pending_volunteers = User.objects.filter(
        profile__role='user',
        profile__is_approved=False
    ).select_related('profile').order_by('-date_joined')

    # Support limit parameter
    limit = request.query_params.get('limit')
    if limit:
        try:
            pending_volunteers = pending_volunteers[:int(limit)]
        except ValueError:
            pass  # Ignore invalid limit values

    serializer = VolunteerRequestSerializer(pending_volunteers, many=True)
    return Response({
        'results': serializer.data
    })


@api_view(['POST'])
@permission_classes([IsAdmin])
def accept_volunteer_request(request, volunteer_id):
    """
    POST /api/admin/volunteer-requests/{id}/accept/
    Accept a volunteer request
    """
    try:
        volunteer = User.objects.get(id=volunteer_id)
    except User.DoesNotExist:
        return Response(
            {"error": "Volunteer not found"},
            status=status.HTTP_404_NOT_FOUND
        )
    
    # ✅ UPDATED: Mark as approved
    volunteer.profile.is_approved = True
    volunteer.profile.save()
    
    return Response({
        "message": "Volunteer request accepted successfully",
        "volunteer": VolunteerRequestSerializer(volunteer).data
    })


@api_view(['POST'])
@permission_classes([IsAdmin])
def reject_volunteer_request(request, volunteer_id):
    """
    POST /api/admin/volunteer-requests/{id}/reject/
    Reject a volunteer request
    """
    try:
        volunteer = User.objects.get(id=volunteer_id)
    except User.DoesNotExist:
        return Response(
            {"error": "Volunteer not found"},
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Option: Delete the user or mark as rejected
    volunteer_name = volunteer.profile.name
    volunteer.delete()
    
    return Response({
        "message": f"Volunteer request for '{volunteer_name}' rejected successfully"
    })


# ============================================================================
# PERFORMANCE REPORTS
# ============================================================================


class ProjectAssignmentViewSet(viewsets.ModelViewSet):
    queryset = ProjectAssignment.objects.all()
    serializer_class = ProjectAssignmentSerializer
    permission_classes = [IsAdmin]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        project_id = self.request.query_params.get('project')
        if project_id:
            queryset = queryset.filter(project_id=project_id)
        user_id = self.request.query_params.get('user')
        if user_id:
            queryset = queryset.filter(user_id=user_id)
        return queryset


@api_view(['GET'])
@permission_classes([IsAdmin])
def list_users(request):
    """
    GET /api/admin/users/
    Returns list of all registered users with their profiles
    """
    users = User.objects.select_related('profile').all()
    
    data = []
    for user in users:
        data.append({
            'id': user.id,
            'email': user.email,
            'name': user.profile.name,
            'role': user.profile.role,
            'skills': user.profile.skills,
            'city': user.profile.city,
            'total_volunteer_hours': user.profile.total_volunteer_hours,
            'completed_tasks_count': user.profile.completed_tasks_count,
        })
    
    return Response(data)


# ============================================================================
# ADMIN REPORTS GENERATION
# ============================================================================

# ============================================================================
# VOLUNTEER-SPECIFIC ENDPOINTS (User Pages)
# ============================================================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_volunteer_stats(request):
    """
    GET /api/user/my-stats/
    Returns statistics for the logged-in volunteer
    """
    user = request.user
    profile = user.profile

    # Get completed tasks count
    completed_tasks = user.assigned_tasks.filter(status='مكتملة').count()

    # Get total volunteer hours
    volunteer_hours = profile.total_volunteer_hours or 0

    # Get rating
    rating = float(profile.rating) if profile.rating else 0.0

    # Calculate points (simple formula: hours + completed_tasks * 10)
    points = int(volunteer_hours) + (completed_tasks * 10)

    return Response({
        'volunteer_hours': volunteer_hours,
        'rating': rating,
        'completed_tasks': completed_tasks,
        'points': points,
        'name': profile.name,
        'email': user.email
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_tasks(request):
    """
    GET /api/user/my-tasks/
    Returns tasks assigned to the logged-in volunteer
    """
    user = request.user

    # Get tasks assigned to this volunteer, excluding completed ones for the main page
    tasks = user.assigned_tasks.select_related('project').prefetch_related('subtasks').all()

    serializer = TaskSerializer(tasks, many=True)
    return Response({
        'results': serializer.data
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def public_projects(request):
    """
    GET /api/public-projects/
    Public endpoint - returns all visible projects for public viewing
    No authentication required
    """
    # Get all visible projects (not hidden)
    profiles = VolunteeringProfile.objects.filter(
        is_hidden=False
    ).select_related("project").order_by('-created_at')

    serializer = ProjectSerializer(profiles, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def available_opportunities(request):
    """
    GET /api/user/opportunities/
    Returns available projects/opportunities that volunteers can apply to
    Shows all projects that are NOT hidden (is_hidden=False)
    Volunteers can apply and wait for admin approval
    Requires authentication
    """
    # Get all visible projects (regardless of status)
    opportunities = VolunteeringProfile.objects.filter(
        is_hidden=False
    ).select_related("project").order_by('-created_at')

    serializer = ProjectSerializer(opportunities, many=True)
    return Response({
        'results': serializer.data
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def apply_to_opportunity(request, project_id):
    """
    POST /api/user/opportunities/{project_id}/apply/
    Apply to an opportunity/project - Creates an application for admin review
    """
    try:
        from projects.models import Project
        platform_project = Project.objects.get(id=project_id)
        user = request.user

        existing_application = VolunteerApplication.objects.filter(
            project=platform_project,
            volunteer=user
        ).first()

        if existing_application:
            return Response(
                {'message': 'لقد تقدمت لهذه الفرصة من قبل'},
                status=status.HTTP_400_BAD_REQUEST
            )

        application = VolunteerApplication.objects.create(
            volunteer=user,
            project=platform_project,
            message=request.data.get('message', ''),
            status='قيد المراجعة'
        )

        notify(
            message=f"طلب تطوع جديد على مشروع {platform_project.name}",
            roles=["admin"],
            notification_type="action",
            link="/Admin/volunteers/applications",
            event_type=EVENT_VOLUNTEER,
        )

        return Response({
            'message': 'تم إرسال طلبك بنجاح. سيتم مراجعته من قبل المشرف.',
            'application_id': application.id
        })

    except Project.DoesNotExist:
        return Response(
            {'error': 'المشروع غير موجود'},
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def withdraw_from_task(request, task_id):
    """
    POST /api/user/tasks/{task_id}/withdraw/
    Withdraw from a task - marks it as cancelled instead of deleting
    """
    try:
        task = Task.objects.get(id=task_id, volunteer=request.user)

        # Don't delete - just mark as cancelled so it appears in cancelled tab
        task.status = 'ملغاة'
        task.save()

        return Response({
            'message': f'تم الانسحاب من المهمة "{task.title}" بنجاح'
        })

    except Task.DoesNotExist:
        return Response(
            {'error': 'المهمة غير موجودة أو ليس لديك صلاحية للانسحاب منها'},
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_task_progress(request, task_id):
    """
    PATCH /api/user/tasks/{task_id}/update-progress/
    Update task progress and subtasks
    Body: {
        "progress": 50,
        "subtasks": [
            {"text": "Task 1", "done": true},
            {"text": "Task 2", "done": false}
        ]
    }
    """
    try:
        task = Task.objects.get(id=task_id, volunteer=request.user)

        # Track if task was already completed before this update
        was_completed = task.status == 'مكتملة'

        # Update progress if provided
        if 'progress' in request.data:
            task.progress = request.data['progress']

            # Auto-update status based on progress
            if task.progress == 100:
                task.status = 'مكتملة'
            elif task.progress > 0:
                task.status = 'قيد التنفيذ'

        # Update subtasks if provided
        if 'subtasks' in request.data:
            # Delete existing subtasks
            task.subtasks.all().delete()

            # Create new subtasks
            for idx, subtask_data in enumerate(request.data['subtasks']):
                Subtask.objects.create(
                    task=task,
                    title=subtask_data.get('text', ''),
                    completed=subtask_data.get('done', False),
                    order=idx
                )

        task.save()

        # Update volunteer profile stats based on completion status change
        is_now_completed = task.status == 'مكتملة'
        profile = request.user.profile

        # Task just became completed - add stats
        if is_now_completed and not was_completed:
            profile.total_volunteer_hours += task.hours or 0
            profile.completed_tasks_count += 1
            profile.points = profile.total_volunteer_hours + (profile.completed_tasks_count * 10)
            profile.save()

        # Task was un-completed - subtract stats
        elif was_completed and not is_now_completed:
            profile.total_volunteer_hours = max(0, profile.total_volunteer_hours - (task.hours or 0))
            profile.completed_tasks_count = max(0, profile.completed_tasks_count - 1)
            profile.points = profile.total_volunteer_hours + (profile.completed_tasks_count * 10)
            profile.save()

        serializer = TaskSerializer(task)
        return Response({
            'message': 'تم تحديث المهمة بنجاح',
            'task': serializer.data
        })

    except Task.DoesNotExist:
        return Response(
            {'error': 'المهمة غير موجودة أو ليس لديك صلاحية لتحديثها'},
            status=status.HTTP_404_NOT_FOUND
        )


# ============================================================================
# VOLUNTEER APPLICATION MANAGEMENT (ADMIN)
# ============================================================================

@api_view(['GET'])
@permission_classes([IsAdmin])
def list_volunteer_applications(request):
    """
    GET /api/admin/applications/
    List all volunteer applications with optional status filter
    """
    status_filter = request.query_params.get('status', None)

    applications = VolunteerApplication.objects.select_related(
        'volunteer__profile', 'project', 'reviewed_by__profile'
    ).all()

    if status_filter:
        applications = applications.filter(status=status_filter)

    serializer = VolunteerApplicationSerializer(applications, many=True)
    return Response({'results': serializer.data})


@api_view(['POST'])
@permission_classes([IsAdmin])
def accept_volunteer_application(request, application_id):
    """
    POST /api/admin/applications/{application_id}/accept/
    Accept a volunteer application and create a task for the volunteer
    """
    try:
        application = VolunteerApplication.objects.get(id=application_id)

        if application.status != 'قيد المراجعة':
            return Response(
                {'error': 'هذا الطلب تم مراجعته بالفعل'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Update application status
        application.status = 'مقبول'
        application.reviewed_by = request.user
        application.reviewed_at = timezone.now()
        application.admin_notes = request.data.get('admin_notes', '')
        application.save()

        # Create a task for the volunteer
        task = Task.objects.create(
            title=f"مهمة في {application.project.title}",
            description=application.project.desc or "لا يوجد وصف",
            project=application.project,
            volunteer=application.volunteer,
            status='قيد التنفيذ',  # Accepted = In Progress
            priority='متوسطة',
            hours=application.project.estimated_hours or 0
        )

        # Create default subtasks
        default_subtasks = [
            "مراجعة متطلبات المهمة",
            "البدء في التنفيذ",
            "إتمام المهمة ومراجعتها",
        ]

        for idx, subtask_title in enumerate(default_subtasks):
            Subtask.objects.create(
                task=task,
                title=subtask_title,
                completed=False,
                order=idx
            )

        return Response({
            'message': 'تم قبول الطلب وإنشاء مهمة للمتطوع',
            'task_id': task.id
        })

    except VolunteerApplication.DoesNotExist:
        return Response(
            {'error': 'الطلب غير موجود'},
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(['POST'])
@permission_classes([IsAdmin])
def reject_volunteer_application(request, application_id):
    """
    POST /api/admin/applications/{application_id}/reject/
    Reject a volunteer application
    """
    try:
        application = VolunteerApplication.objects.get(id=application_id)

        if application.status != 'قيد المراجعة':
            return Response(
                {'error': 'هذا الطلب تم مراجعته بالفعل'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Update application status
        application.status = 'مرفوض'
        application.reviewed_by = request.user
        application.reviewed_at = timezone.now()
        application.admin_notes = request.data.get('admin_notes', '')
        application.save()

        return Response({
            'message': 'تم رفض الطلب'
        })

    except VolunteerApplication.DoesNotExist:
        return Response(
            {'error': 'الطلب غير موجود'},
            status=status.HTTP_404_NOT_FOUND
        )

# ============================================================================
# PUBLIC ENDPOINTS (No Authentication Required)
# ============================================================================

@api_view(['GET'])
@permission_classes([AllowAny])
def public_volunteers_stats(request):
    """
    GET /api/public-volunteers-stats/
    إحصاءات مجمّعة فقط — لا تُرجع صفوفاً لكل متطوّع (خصوصية).
    """
    from accounts.models import Profile

    volunteers = Profile.objects.filter(role='user', is_approved=True)
    volunteer_users = User.objects.filter(profile__in=volunteers)

    total_hours = Task.objects.filter(
        volunteer__in=volunteer_users,
        status='مكتملة',
    ).aggregate(total=Sum('hours'))['total'] or 0

    participations = Task.objects.filter(
        volunteer__in=volunteer_users,
    ).exclude(status='ملغاة').count()

    successes = Task.objects.filter(
        volunteer__in=volunteer_users,
        status='مكتملة',
    ).count()

    return Response({
        'total_volunteers': volunteers.count(),
        'by_gender': {
            'male': volunteers.filter(gender='ذكر').count(),
            'female': volunteers.filter(gender='أنثى').count(),
        },
        'total_hours': int(total_hours),
        'total_participations': participations,
        'total_successes': successes,
    })



@api_view(['GET'])
@permission_classes([AllowAny])
def public_home_stats(request):
    """
    GET /api/public-home-stats/
    Returns aggregated statistics for home page (Hero section)
    No authentication required
    """
    # Total beneficiaries from all projects
    total_beneficiaries = project_helpers.aggregate_beneficiaries()

    potential_projects = VolunteeringProfile.objects.exclude(volunteer_status='CANCELLED').count()

    total_donations = project_helpers.aggregate_donations()

    return Response({
        'beneficiaries': total_beneficiaries,
        'potential_projects': potential_projects,
        'donations': float(total_donations),
    })
