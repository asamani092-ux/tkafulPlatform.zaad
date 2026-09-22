"""
نماذج ملف المشروع الداخلي (غير ظاهر للعامة).
التعقيد: إنشاء الملف مع الأقسام والمراحل O(S)؛ الاستعلامات المفهرسة O(log N).
"""
from __future__ import annotations

import secrets
import uuid
from datetime import timedelta

from django.conf import settings
from django.db import models
from django.utils import timezone


def dossier_attachment_path(instance, filename: str) -> str:
    safe = filename.replace("/", "_").replace("\\", "_")[:180]
    return f"private/dossiers/{instance.dossier_id}/{uuid.uuid4().hex}_{safe}"


class ProjectDossier(models.Model):
    STATUS_CHOICES = [
        ("draft", "مسودة"),
        ("in_progress", "قيد التنفيذ"),
        ("pending_approval", "بانتظار الاعتماد"),
        ("approved", "معتمد"),
        ("closed", "مغلق"),
    ]
    STAGE_CHOICES = [
        ("define", "تحديد وتعريف المشروع"),
        ("prepare", "إعداد المشروع"),
        ("plan", "التخطيط للمشروع"),
        ("execute", "تنفيذ المشروع"),
        ("close", "إغلاق المشروع"),
    ]

    project = models.OneToOneField(
        "projects.Project",
        on_delete=models.CASCADE,
        related_name="dossier",
    )
    code = models.CharField(max_length=32, unique=True, db_index=True)
    marketing_name = models.CharField(max_length=200, blank=True)
    portfolio = models.CharField(max_length=200, blank=True)
    department = models.CharField(max_length=200, blank=True)
    section = models.CharField(max_length=200, blank=True)
    strategic_goal = models.TextField(blank=True)
    location = models.CharField(max_length=300, blank=True)
    projects_office_name = models.CharField(max_length=200, blank=True, help_text="عرض فقط")
    projects_committee_name = models.CharField(max_length=200, blank=True, help_text="عرض فقط")
    sponsor_name = models.CharField(max_length=200, blank=True)
    sponsor_email = models.EmailField(blank=True)
    manager = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="managed_dossiers",
    )
    manager_email = models.EmailField(blank=True)
    current_stage = models.CharField(max_length=20, choices=STAGE_CHOICES, default="define")
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default="draft")
    budget_association = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    budget_donation = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    budget_total = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status", "current_stage"]),
            models.Index(fields=["sponsor_email"]),
        ]

    def __str__(self):
        return f"{self.code} — {self.project.name}"

    def recompute_budget_total(self):
        self.budget_total = (self.budget_association or 0) + (self.budget_donation or 0)


class DossierSection(models.Model):
    KIND_CHOICES = [
        ("document", "وثيقة المشروع"),
        ("closure", "وثيقة الإغلاق"),
    ]
    STATUS_CHOICES = [
        ("empty", "فارغ"),
        ("filled", "معبّأ"),
        ("submitted", "مُرسل"),
        ("approved", "معتمد"),
        ("returned", "معاد للتعديل"),
    ]

    dossier = models.ForeignKey(ProjectDossier, on_delete=models.CASCADE, related_name="sections")
    kind = models.CharField(max_length=20, choices=KIND_CHOICES)
    key = models.CharField(max_length=64)
    data = models.JSONField(default=dict, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="empty")
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="+",
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["kind", "key"]
        constraints = [
            models.UniqueConstraint(fields=["dossier", "kind", "key"], name="uq_dossier_section"),
        ]
        indexes = [models.Index(fields=["dossier", "kind", "status"])]

    def __str__(self):
        return f"{self.dossier_id}:{self.kind}:{self.key}"


class DossierStage(models.Model):
    KEY_CHOICES = [
        ("define", "تحديد وتعريف المشروع"),
        ("prepare", "إعداد المشروع"),
        ("plan", "التخطيط للمشروع"),
        ("execute", "تنفيذ المشروع"),
        ("close", "إغلاق المشروع"),
    ]
    STATUS_CHOICES = [
        ("locked", "مقفلة"),
        ("active", "نشطة"),
        ("submitted", "بانتظار الاعتماد"),
        ("approved", "معتمدة"),
        ("returned", "معادة للتعديل"),
    ]

    dossier = models.ForeignKey(ProjectDossier, on_delete=models.CASCADE, related_name="stages")
    order = models.PositiveSmallIntegerField()
    key = models.CharField(max_length=20, choices=KEY_CHOICES)
    planned_start = models.DateField(null=True, blank=True)
    planned_end = models.DateField(null=True, blank=True)
    deliverable_title = models.CharField(max_length=300, blank=True)
    deliverable_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="locked")
    return_note = models.TextField(blank=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["order"]
        constraints = [
            models.UniqueConstraint(fields=["dossier", "order"], name="uq_dossier_stage_order"),
            models.UniqueConstraint(fields=["dossier", "key"], name="uq_dossier_stage_key"),
        ]

    def __str__(self):
        return f"{self.dossier_id}:{self.order}:{self.key}"


class StageActivity(models.Model):
    MANUAL_STATUS_CHOICES = [
        ("", "—"),
        ("in_progress", "جاري التنفيذ"),
        ("done", "تم التنفيذ"),
    ]
    AUTO_STATUS_CHOICES = [
        ("not_due", "لم يحن"),
        ("in_progress", "جاري"),
        ("done", "منفذ"),
        ("delayed", "متعثر"),
        ("stopped", "موقوف"),
    ]

    stage = models.ForeignKey(DossierStage, on_delete=models.CASCADE, related_name="activities")
    code = models.CharField(max_length=40)
    parent = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="children",
    )
    title = models.CharField(max_length=300)
    responsible = models.CharField(max_length=200, blank=True)
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    manual_status = models.CharField(max_length=20, choices=MANUAL_STATUS_CHOICES, blank=True, default="")
    auto_status = models.CharField(max_length=20, choices=AUTO_STATUS_CHOICES, default="not_due")
    progress_pct = models.PositiveSmallIntegerField(default=0)
    kpi = models.CharField(max_length=300, blank=True)
    sponsor_rating = models.PositiveSmallIntegerField(null=True, blank=True)
    lessons = models.TextField(blank=True)
    notes = models.TextField(blank=True)
    risks = models.TextField(blank=True)
    sort_order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["sort_order", "code", "id"]
        indexes = [models.Index(fields=["stage", "auto_status"])]

    def __str__(self):
        return f"{self.code} — {self.title}"


class ApprovalRequest(models.Model):
    SCOPE_CHOICES = [
        ("card", "البطاقة"),
        ("stage", "مرحلة"),
        ("document", "الوثيقة"),
        ("closure", "الإغلاق"),
    ]
    DECISION_CHOICES = [
        ("pending", "بانتظار"),
        ("approved", "معتمد"),
        ("returned", "إعادة للتعديل"),
        ("expired", "منتهي"),
    ]

    dossier = models.ForeignKey(ProjectDossier, on_delete=models.CASCADE, related_name="approvals")
    scope = models.CharField(max_length=20, choices=SCOPE_CHOICES)
    stage = models.ForeignKey(
        DossierStage,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="approvals",
    )
    token = models.CharField(max_length=64, unique=True, db_index=True)
    expires_at = models.DateTimeField()
    decision = models.CharField(max_length=20, choices=DECISION_CHOICES, default="pending")
    decided_at = models.DateTimeField(null=True, blank=True)
    note = models.TextField(blank=True)
    payload_snapshot = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["decision", "expires_at"])]

    def __str__(self):
        return f"{self.scope}:{self.token[:8]}… ({self.decision})"

    @staticmethod
    def mint_token() -> str:
        return secrets.token_urlsafe(32)

    @classmethod
    def create_pending(cls, *, dossier, scope: str, stage=None, payload=None, days: int = 14):
        return cls.objects.create(
            dossier=dossier,
            scope=scope,
            stage=stage,
            token=cls.mint_token(),
            expires_at=timezone.now() + timedelta(days=days),
            payload_snapshot=payload or {},
        )

    @property
    def is_usable(self) -> bool:
        if self.decision != "pending":
            return False
        return timezone.now() <= self.expires_at


class DossierAttachment(models.Model):
    dossier = models.ForeignKey(ProjectDossier, on_delete=models.CASCADE, related_name="attachments")
    stage = models.ForeignKey(
        DossierStage,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="attachments",
    )
    activity = models.ForeignKey(
        StageActivity,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="attachments",
    )
    section_key = models.CharField(max_length=64, blank=True)
    title = models.CharField(max_length=200, blank=True)
    file = models.FileField(upload_to=dossier_attachment_path, blank=True)
    external_url = models.URLField(blank=True)
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="+",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.title or f"attachment-{self.pk}"


class BudgetLine(models.Model):
    """بند تكلفة مقترح من الوثيقة — الخصم تراكمي عبر BudgetTxn."""

    dossier = models.ForeignKey(ProjectDossier, on_delete=models.CASCADE, related_name="budget_lines")
    title = models.CharField(max_length=300)
    source = models.CharField(max_length=100, blank=True)
    notes = models.CharField(max_length=500, blank=True)
    proposed_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    allocated_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    spent_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    sort_order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["sort_order", "id"]
        indexes = [models.Index(fields=["dossier", "sort_order"])]

    def __str__(self):
        return self.title

    @property
    def remaining(self):
        base = self.allocated_amount if self.allocated_amount else self.proposed_amount
        return (base or 0) - (self.spent_amount or 0)


class BudgetTxn(models.Model):
    """حركة مالية تراكمية على بند (خصم أو تعديل مخصص)."""

    KIND_CHOICES = [
        ("spend", "صرف"),
        ("allocate", "مخصص"),
        ("adjust", "تعديل مقترح"),
    ]

    line = models.ForeignKey(BudgetLine, on_delete=models.CASCADE, related_name="txns")
    kind = models.CharField(max_length=20, choices=KIND_CHOICES)
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    note = models.CharField(max_length=500, blank=True)
    activity = models.ForeignKey(
        StageActivity,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="budget_txns",
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="+",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
