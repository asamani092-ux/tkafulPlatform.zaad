from rest_framework import serializers

from .models import (
    ApprovalRequest,
    BudgetLine,
    BudgetTxn,
    DossierAttachment,
    DossierSection,
    DossierStage,
    DossierWorkspace,
    ProjectDossier,
    StageActivity,
)
from .services import refresh_activity_auto_status


class BudgetLineSerializer(serializers.ModelSerializer):
    remaining = serializers.SerializerMethodField()

    class Meta:
        model = BudgetLine
        fields = (
            "id",
            "title",
            "source",
            "notes",
            "proposed_amount",
            "allocated_amount",
            "spent_amount",
            "remaining",
            "sort_order",
            "updated_at",
        )
        read_only_fields = ("spent_amount", "updated_at")

    def get_remaining(self, obj):
        return str(obj.remaining)


class BudgetTxnSerializer(serializers.ModelSerializer):
    class Meta:
        model = BudgetTxn
        fields = ("id", "line", "kind", "amount", "note", "activity", "created_at")
        read_only_fields = fields


class DossierSectionSerializer(serializers.ModelSerializer):
    class Meta:
        model = DossierSection
        fields = ("id", "kind", "key", "data", "status", "updated_at")


class DossierStageSerializer(serializers.ModelSerializer):
    class Meta:
        model = DossierStage
        fields = (
            "id",
            "order",
            "key",
            "planned_start",
            "planned_end",
            "deliverable_title",
            "deliverable_date",
            "status",
            "return_note",
            "approved_at",
        )


class DossierWorkspaceSerializer(serializers.ModelSerializer):
    label = serializers.SerializerMethodField()
    needs_approval = serializers.SerializerMethodField()

    class Meta:
        model = DossierWorkspace
        fields = (
            "id",
            "order",
            "key",
            "label",
            "status",
            "return_note",
            "approved_at",
            "needs_approval",
        )

    def get_label(self, obj):
        from .sections import WORKSPACES

        return next((w["label"] for w in WORKSPACES if w["key"] == obj.key), obj.key)

    def get_needs_approval(self, obj):
        from .sections import WORKSPACES

        return next((bool(w.get("needs_approval")) for w in WORKSPACES if w["key"] == obj.key), True)


class StageActivitySerializer(serializers.ModelSerializer):
    class Meta:
        model = StageActivity
        fields = (
            "id",
            "stage",
            "code",
            "parent",
            "title",
            "responsible",
            "start_date",
            "end_date",
            "manual_status",
            "auto_status",
            "progress_pct",
            "kpi",
            "sponsor_rating",
            "lessons",
            "notes",
            "risks",
            "sort_order",
            "source",
            "locked",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("auto_status", "source", "locked", "created_at", "updated_at")

    def create(self, validated):
        obj = StageActivity(**validated)
        refresh_activity_auto_status(obj, save=False)
        obj.save()
        return obj

    def update(self, instance, validated):
        for k, v in validated.items():
            setattr(instance, k, v)
        refresh_activity_auto_status(instance, save=False)
        instance.save()
        return instance


class DossierAttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = DossierAttachment
        fields = (
            "id",
            "stage",
            "activity",
            "section_key",
            "title",
            "file",
            "external_url",
            "created_at",
        )
        read_only_fields = ("created_at",)


class ProjectDossierSerializer(serializers.ModelSerializer):
    sections = DossierSectionSerializer(many=True, read_only=True)
    stages = DossierStageSerializer(many=True, read_only=True)
    workspaces = serializers.SerializerMethodField()
    budget_lines = BudgetLineSerializer(many=True, read_only=True)
    project_slug = serializers.CharField(source="project.slug", read_only=True)
    project_name = serializers.CharField(source="project.name", read_only=True)
    manager_username = serializers.CharField(source="manager.username", read_only=True, default="")
    bypass_workspace_gates = serializers.SerializerMethodField()

    class Meta:
        model = ProjectDossier
        fields = (
            "id",
            "project",
            "project_slug",
            "project_name",
            "code",
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
            "execution_start",
            "execution_end",
            "manager",
            "manager_username",
            "manager_email",
            "current_stage",
            "status",
            "budget_association",
            "budget_donation",
            "budget_total",
            "budget_lines",
            "sections",
            "stages",
            "workspaces",
            "bypass_workspace_gates",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("budget_total", "current_stage", "created_at", "updated_at", "code")

    def get_workspaces(self, obj):
        request = self.context.get("request")
        user = getattr(request, "user", None) if request else None
        from .services import workspaces_payload

        return workspaces_payload(obj, user=user)

    def get_bypass_workspace_gates(self, obj):
        request = self.context.get("request")
        user = getattr(request, "user", None) if request else None
        from .services import can_bypass_workspace_gates

        return can_bypass_workspace_gates(user, obj) if user else False


class ProjectDossierListSerializer(serializers.ModelSerializer):
    project_slug = serializers.CharField(source="project.slug", read_only=True)
    project_name = serializers.CharField(source="project.name", read_only=True)

    class Meta:
        model = ProjectDossier
        fields = (
            "id",
            "project",
            "project_slug",
            "project_name",
            "code",
            "marketing_name",
            "current_stage",
            "status",
            "sponsor_email",
            "manager",
            "updated_at",
        )


class ApprovalRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = ApprovalRequest
        fields = (
            "id",
            "scope",
            "stage",
            "token",
            "expires_at",
            "decision",
            "decided_at",
            "note",
            "created_at",
        )
        read_only_fields = fields


class CreateDossierSerializer(serializers.Serializer):
    project_id = serializers.IntegerField(required=False)
    name = serializers.CharField(required=False, allow_blank=True)
    description = serializers.CharField(required=False, allow_blank=True)
    marketing_name = serializers.CharField(required=False, allow_blank=True)
    portfolio = serializers.CharField(required=False, allow_blank=True)
    department = serializers.CharField(required=False, allow_blank=True)
    section = serializers.CharField(required=False, allow_blank=True)
    strategic_goal = serializers.CharField(required=False, allow_blank=True)
    location = serializers.CharField(required=False, allow_blank=True)
    projects_office_name = serializers.CharField(required=False, allow_blank=True)
    projects_committee_name = serializers.CharField(required=False, allow_blank=True)
    sponsor_name = serializers.CharField(required=False, allow_blank=True)
    sponsor_email = serializers.EmailField(required=False, allow_blank=True)
    manager_id = serializers.IntegerField(required=False, allow_null=True)
    manager_email = serializers.EmailField(required=False, allow_blank=True)
    budget_association = serializers.DecimalField(max_digits=14, decimal_places=2, required=False)
    budget_donation = serializers.DecimalField(max_digits=14, decimal_places=2, required=False)


class SectionPatchSerializer(serializers.Serializer):
    data = serializers.DictField()


class DecideSerializer(serializers.Serializer):
    decision = serializers.ChoiceField(choices=["approved", "returned", "revoke"])
    note = serializers.CharField(required=False, allow_blank=True, default="")


class SpendSerializer(serializers.Serializer):
    amount = serializers.DecimalField(max_digits=14, decimal_places=2)
    note = serializers.CharField(required=False, allow_blank=True, default="")
    activity_id = serializers.IntegerField(required=False, allow_null=True)


class AllocateSerializer(serializers.Serializer):
    amount = serializers.DecimalField(max_digits=14, decimal_places=2)
    note = serializers.CharField(required=False, allow_blank=True, default="")


class CompleteActivitySerializer(serializers.Serializer):
    lessons = serializers.CharField(required=False, allow_blank=True, default="")
    notes = serializers.CharField(required=False, allow_blank=True, default="")
    evidence_url = serializers.URLField(required=False, allow_blank=True, default="")
    evidence_title = serializers.CharField(required=False, allow_blank=True, default="")
