"""واجهات ملف المشروع — إدارة + اعتماد عام."""
from __future__ import annotations

from django.shortcuts import get_object_or_404
from rest_framework import status, viewsets
from rest_framework.decorators import action, api_view, permission_classes, throttle_classes
from rest_framework.exceptions import ValidationError
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from core.permissions import is_super_admin
from core.throttles import AuthRateThrottle
from projects.models import Project

from . import services
from .models import ApprovalRequest, ProjectDossier, StageActivity
from .permissions import CanManageDossier
from .sections import schema_payload
from .serializers import (
    AllocateSerializer,
    BudgetLineSerializer,
    CompleteActivitySerializer,
    CreateDossierSerializer,
    DecideSerializer,
    DossierAttachmentSerializer,
    DossierSectionSerializer,
    DossierStageSerializer,
    ProjectDossierListSerializer,
    ProjectDossierSerializer,
    SectionPatchSerializer,
    SpendSerializer,
    StageActivitySerializer,
)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def dossier_schema(request):
    return Response(schema_payload())


class ProjectDossierViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, CanManageDossier]
    parser_classes = [JSONParser, MultiPartParser, FormParser]
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def get_queryset(self):
        qs = ProjectDossier.objects.select_related("project", "manager").prefetch_related(
            "sections", "stages", "workspaces"
        )
        user = self.request.user
        if is_super_admin(user):
            return qs
        from django.db.models import Q

        email = (getattr(user, "email", "") or "").strip()
        if email:
            return qs.filter(Q(manager=user) | Q(sponsor_email__iexact=email))
        return qs.filter(manager=user)

    def get_serializer_class(self):
        if self.action == "list":
            return ProjectDossierListSerializer
        return ProjectDossierSerializer

    def get_permissions(self):
        if self.action == "create":
            return [IsAuthenticated()]
        return super().get_permissions()

    def create(self, request, *args, **kwargs):
        services.assert_can_create(request.user)
        ser = CreateDossierSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = dict(ser.validated_data)
        # مسار جديد: اسم + راعي → مشروع + ملف
        if data.get("name") and not data.get("project_id"):
            dossier = services.create_project_with_dossier(
                name=data.get("name") or "",
                sponsor_name=data.get("sponsor_name") or "",
                sponsor_email=data.get("sponsor_email") or "",
                description=data.get("description") or "",
                manager_id=data.get("manager_id"),
                actor=request.user,
                request=request,
            )
            return Response(
                ProjectDossierSerializer(dossier, context={"request": request}).data,
                status=status.HTTP_201_CREATED,
            )
        project_id = data.pop("project_id", None)
        if not project_id:
            return Response(
                {"detail": "project_id أو name مطلوب"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        project = get_object_or_404(Project, pk=project_id)
        dossier = services.create_dossier_for_project(
            project=project,
            actor=request.user,
            card=data,
            request=request,
        )
        return Response(
            ProjectDossierSerializer(dossier, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )

    def partial_update(self, request, *args, **kwargs):
        dossier = self.get_object()
        services.assert_can_edit(request.user, dossier)
        allowed = {
            "marketing_name",
            "portfolio",
            "department",
            "section",
            "strategic_goal",
            "location",
            "projects_office_name",
            "projects_committee_name",
            "sponsor_name",
            "sponsor_email",
            "manager_email",
            "budget_association",
            "budget_donation",
            "execution_start",
            "execution_end",
        }
        for key in allowed:
            if key in request.data:
                val = request.data[key]
                if key in ("execution_start", "execution_end") and val == "":
                    val = None
                setattr(dossier, key, val)
        if "manager" in request.data or "manager_id" in request.data:
            if not is_super_admin(request.user):
                return Response({"detail": "تعيين المسؤول للمشرف فقط"}, status=403)
            mid = request.data.get("manager") or request.data.get("manager_id")
            dossier.manager_id = mid or None
        dossier.recompute_budget_total()
        dossier.save()
        return Response(ProjectDossierSerializer(dossier, context={"request": request}).data)

    @action(detail=False, methods=["get"], url_path=r"by-project/(?P<slug>[^/.]+)")
    def by_project(self, request, slug=None):
        dossier = self.get_queryset().filter(project__slug=slug).first()
        if not dossier:
            return Response({"detail": "لا يوجد ملف"}, status=404)
        self.check_object_permissions(request, dossier)
        return Response(ProjectDossierSerializer(dossier, context={"request": request}).data)

    @action(detail=True, methods=["patch"], url_path=r"sections/(?P<kind>[^/.]+)/(?P<key>[^/.]+)")
    def patch_section(self, request, pk=None, kind=None, key=None):
        dossier = self.get_object()
        ser = SectionPatchSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        section = services.update_section(
            dossier=dossier,
            kind=kind,
            key=key,
            data=ser.validated_data["data"],
            user=request.user,
        )
        return Response(DossierSectionSerializer(section).data)

    @action(detail=True, methods=["post"], url_path=r"workspaces/(?P<key>[^/.]+)/submit")
    def submit_workspace(self, request, pk=None, key=None):
        dossier = self.get_object()
        approval = services.submit_workspace(
            dossier=dossier,
            key=key,
            user=request.user,
            request=request,
        )
        return Response(
            {
                "detail": "أُرسل للاعتماد",
                "approval_id": approval.id,
                "expires_at": approval.expires_at,
                "token_hint": approval.token[:8],
            },
            status=201,
        )

    @action(detail=True, methods=["post"], url_path=r"workspaces/(?P<key>[^/.]+)/decide")
    def decide_workspace(self, request, pk=None, key=None):
        dossier = self.get_object()
        ser = DecideSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        approval = services.admin_decide_workspace(
            dossier=dossier,
            key=key,
            decision=ser.validated_data["decision"],
            note=ser.validated_data.get("note") or "",
            user=request.user,
            request=request,
        )
        return Response({"decision": approval.decision, "note": approval.note})

    @action(detail=True, methods=["post"], url_path=r"stages/(?P<order>[0-9]+)/submit")
    def submit_stage(self, request, pk=None, order=None):
        dossier = self.get_object()
        approval = services.submit_stage(
            dossier=dossier,
            order=int(order),
            user=request.user,
            request=request,
        )
        return Response(
            {
                "detail": "أُرسل للاعتماد",
                "approval_id": approval.id,
                "expires_at": approval.expires_at,
                "token_hint": approval.token[:8],
            },
            status=201,
        )

    @action(detail=True, methods=["post"], url_path=r"stages/(?P<order>[0-9]+)/decide")
    def decide_stage(self, request, pk=None, order=None):
        dossier = self.get_object()
        ser = DecideSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        approval = services.admin_decide_stage(
            dossier=dossier,
            order=int(order),
            decision=ser.validated_data["decision"],
            note=ser.validated_data.get("note") or "",
            user=request.user,
            request=request,
        )
        return Response({"decision": approval.decision, "note": approval.note})

    @action(detail=True, methods=["patch"], url_path=r"stages/(?P<order>[0-9]+)")
    def patch_stage(self, request, pk=None, order=None):
        dossier = self.get_object()
        services.assert_can_edit(request.user, dossier)
        stage = dossier.stages.filter(order=int(order)).first()
        if not stage:
            return Response({"detail": "مرحلة غير موجودة"}, status=404)
        for f in ("planned_start", "planned_end", "deliverable_title", "deliverable_date"):
            if f in request.data:
                setattr(stage, f, request.data[f] or None)
        stage.save()
        return Response(DossierStageSerializer(stage).data)

    @action(detail=True, methods=["get", "post"], url_path="activities")
    def activities(self, request, pk=None):
        dossier = self.get_object()
        if request.method == "GET":
            qs = StageActivity.objects.filter(stage__dossier=dossier).select_related("stage", "parent")
            return Response(StageActivitySerializer(qs, many=True).data)
        services.assert_can_edit(request.user, dossier)
        data = {**request.data}
        stage_id = data.get("stage")
        stage = dossier.stages.filter(pk=stage_id).first() if stage_id else None
        if stage_id and not stage:
            return Response({"stage": "مرحلة لا تتبع هذا الملف"}, status=400)
        try:
            services.assert_workspace_open_for_work(request.user, dossier, "plan")
        except ValidationError as exc:
            return Response(exc.detail, status=400)
        ser = StageActivitySerializer(data=data)
        ser.is_valid(raise_exception=True)
        obj = ser.save()
        return Response(StageActivitySerializer(obj).data, status=201)

    @action(
        detail=True,
        methods=["patch", "delete"],
        url_path=r"activities/(?P<activity_id>[0-9]+)",
    )
    def activity_detail(self, request, pk=None, activity_id=None):
        dossier = self.get_object()
        services.assert_can_edit(request.user, dossier)
        activity = get_object_or_404(StageActivity, pk=activity_id, stage__dossier=dossier)
        try:
            services.assert_workspace_open_for_work(request.user, dossier, "plan")
        except ValidationError as exc:
            return Response(exc.detail, status=400)
        if request.method == "DELETE":
            activity.delete()
            return Response(status=204)
        ser = StageActivitySerializer(activity, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        obj = ser.save()
        return Response(StageActivitySerializer(obj).data)

    @action(detail=True, methods=["get", "post"], url_path="attachments")
    def attachments(self, request, pk=None):
        dossier = self.get_object()
        if request.method == "GET":
            return Response(DossierAttachmentSerializer(dossier.attachments.all(), many=True).data)
        services.assert_can_edit(request.user, dossier)
        ser = DossierAttachmentSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        obj = ser.save(dossier=dossier, uploaded_by=request.user)
        return Response(DossierAttachmentSerializer(obj).data, status=201)

    @action(detail=True, methods=["get"], url_path="dashboard")
    def dashboard(self, request, pk=None):
        return Response(services.dashboard_stats(self.get_object()))

    @action(detail=True, methods=["get"], url_path="comparison")
    def comparison(self, request, pk=None):
        return Response(services.document_closure_comparison(self.get_object()))

    @action(detail=True, methods=["get"], url_path="info-page")
    def info_page(self, request, pk=None):
        """صفحة المعلومات — قراءة فقط تعكس بيانات البطاقة."""
        return Response(services.info_page_payload(self.get_object()))

    @action(detail=True, methods=["get"], url_path="budget-lines")
    def budget_lines(self, request, pk=None):
        dossier = self.get_object()
        return Response(BudgetLineSerializer(dossier.budget_lines.all(), many=True).data)

    @action(
        detail=True,
        methods=["post"],
        url_path=r"budget-lines/(?P<line_id>[0-9]+)/allocate",
    )
    def allocate_line(self, request, pk=None, line_id=None):
        dossier = self.get_object()
        ser = AllocateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        line = services.allocate_budget_line(
            dossier=dossier,
            line_id=int(line_id),
            amount=ser.validated_data["amount"],
            user=request.user,
            note=ser.validated_data.get("note") or "",
        )
        return Response(BudgetLineSerializer(line).data)

    @action(
        detail=True,
        methods=["post"],
        url_path=r"budget-lines/(?P<line_id>[0-9]+)/spend",
    )
    def spend_line(self, request, pk=None, line_id=None):
        dossier = self.get_object()
        ser = SpendSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        activity = None
        aid = ser.validated_data.get("activity_id")
        if aid:
            activity = StageActivity.objects.filter(pk=aid, stage__dossier=dossier).first()
        line = services.spend_budget_line(
            dossier=dossier,
            line_id=int(line_id),
            amount=ser.validated_data["amount"],
            user=request.user,
            activity=activity,
            note=ser.validated_data.get("note") or "",
        )
        return Response(BudgetLineSerializer(line).data)

    @action(
        detail=True,
        methods=["post"],
        url_path=r"activities/(?P<activity_id>[0-9]+)/complete",
    )
    def complete_activity(self, request, pk=None, activity_id=None):
        dossier = self.get_object()
        activity = get_object_or_404(StageActivity, pk=activity_id, stage__dossier=dossier)
        ser = CompleteActivitySerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        obj = services.complete_activity(
            dossier=dossier,
            activity=activity,
            user=request.user,
            lessons=ser.validated_data.get("lessons") or "",
            notes=ser.validated_data.get("notes") or "",
            evidence_url=ser.validated_data.get("evidence_url") or "",
            evidence_file=request.FILES.get("file"),
            evidence_title=ser.validated_data.get("evidence_title") or "",
        )
        return Response(StageActivitySerializer(obj).data)

    @action(detail=True, methods=["get"], url_path="export-payload")
    def export_payload(self, request, pk=None):
        dossier = self.get_object()
        return Response(
            {
                "code": dossier.code,
                "project_name": dossier.project.name,
                "marketing_name": dossier.marketing_name,
                "sponsor_name": dossier.sponsor_name,
                "projects_office_name": dossier.projects_office_name,
                "projects_committee_name": dossier.projects_committee_name,
                "document": [
                    {"key": s.key, "status": s.status, "data": s.data}
                    for s in dossier.sections.filter(kind="document")
                ],
                "closure": [
                    {"key": s.key, "status": s.status, "data": s.data}
                    for s in dossier.sections.filter(kind="closure")
                ],
                "comparison": services.document_closure_comparison(dossier),
                "schema": schema_payload(),
            }
        )

@api_view(["GET"])
@permission_classes([AllowAny])
@throttle_classes([AuthRateThrottle])
def public_approval_get(request, token: str):
    approval = (
        ApprovalRequest.objects.select_related("dossier", "dossier__project", "stage")
        .filter(token=token)
        .first()
    )
    if not approval:
        return Response({"detail": "رابط غير صالح"}, status=404)
    return Response(services.public_approval_payload(approval))


@api_view(["POST"])
@permission_classes([AllowAny])
@throttle_classes([AuthRateThrottle])
def public_approval_decide(request, token: str):
    approval = (
        ApprovalRequest.objects.select_related("dossier", "stage").filter(token=token).first()
    )
    if not approval:
        return Response({"detail": "رابط غير صالح"}, status=404)
    ser = DecideSerializer(data=request.data)
    ser.is_valid(raise_exception=True)
    from rest_framework.exceptions import ValidationError

    try:
        result = services.apply_approval_decision(
            approval=approval,
            decision=ser.validated_data["decision"],
            note=ser.validated_data.get("note") or "",
            actor=None,
            request=request,
        )
    except ValidationError as exc:
        return Response({"detail": exc.detail}, status=400)
    return Response({"decision": result.decision, "note": result.note})
