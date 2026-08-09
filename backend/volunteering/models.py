"""
نماذج التطوّع الأساسية (Phase A4: services/reporting منفصلة — D-26).
"""
from django.db import models
from django.contrib.auth.models import User

# Shim re-exports for backward-compatible imports (analytics, admin, tests)
from services.models import (  # noqa: F401
    Service,
    ServiceRequest,
    ServiceVolunteerApplication,
    Suggestion,
    WaterSupplyRequest,
)
from reporting.models import (  # noqa: F401
    AdminReport,
    DepartmentHours,
    QuarterlyTarget,
    TopVolunteer,
    VolunteerStatistics,
)

VOLUNTEER_STATUS_CHOICES = [
    ("PLANNED", "Planned"),
    ("ACTIVE", "Active"),
    ("COMPLETED", "Completed"),
    ("CANCELLED", "Cancelled"),
]

PLATFORM_STATUS_MAP = {
    "PLANNED": "draft",
    "ACTIVE": "active",
    "COMPLETED": "completed",
    "CANCELLED": "archived",
}

KNOWN_PROJECT_SLUGS = {
    "تفقدهم": "tafaqqadhum",
    "منصة تكافل وأثر": "takaful-athar",
    "تكافل وأثر": "takaful-athar",
    "سقيا الزاد": "saqya",
}


class VolunteeringProfile(models.Model):
    """حقول التطوّع الخاصة بمشروع منصّة (OneToOne → projects.Project)."""
    project = models.OneToOneField(
        "projects.Project",
        on_delete=models.CASCADE,
        related_name="volunteering_profile",
    )
    category = models.CharField(max_length=50, blank=True)
    target_audience = models.CharField(max_length=200, blank=True)
    beneficiaries = models.IntegerField(default=0)
    location = models.CharField(max_length=200, blank=True)
    donation_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    implementation_requirements = models.TextField(blank=True)
    project_goals = models.TextField(blank=True)
    estimated_hours = models.IntegerField(default=0)
    supervisor = models.CharField(max_length=200, blank=True)
    duration = models.CharField(max_length=100, blank=True)
    tags = models.JSONField(default=list, blank=True)
    progress = models.IntegerField(default=0)
    organization = models.CharField(max_length=200, blank=True)
    hours = models.CharField(max_length=50, blank=True)
    is_hidden = models.BooleanField(default=False)
    budget = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    manager_employee = models.ForeignKey(
        "analytics.Employee",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="managed_volunteering_profiles",
    )
    external_source = models.CharField(max_length=50, blank=True)
    external_id = models.CharField(max_length=100, blank=True)
    volunteer_status = models.CharField(
        max_length=20, choices=VOLUNTEER_STATUS_CHOICES, default="PLANNED"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "volunteering_profile"
        ordering = ["-created_at"]

    def __str__(self):
        return self.project.name

    @property
    def title(self):
        return self.project.name

    @property
    def desc(self):
        return self.project.description

    @property
    def status(self):
        return self.volunteer_status


class Volunteer(models.Model):
    full_name = models.CharField(max_length=200)
    phone = models.CharField(max_length=50, blank=True)
    email = models.EmailField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "takaful_app_volunteer"

    def __str__(self):
        return self.full_name


class ProjectAssignment(models.Model):
    STATUS_CHOICES = [
        ("جديدة", "New"),
        ("قيد التنفيذ", "In Progress"),
        ("معلقة", "On Hold"),
        ("مكتملة", "Completed"),
        ("ملغية", "Cancelled"),
    ]

    project = models.ForeignKey(
        "projects.Project", on_delete=models.CASCADE, related_name="assignments"
    )
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="project_assignments")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="جديدة")
    assigned_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    hours_contributed = models.IntegerField(default=0)
    progress = models.IntegerField(default=0)
    notes = models.TextField(blank=True)

    class Meta:
        db_table = "takaful_app_projectassignment"
        unique_together = ["project", "user"]
        ordering = ["-assigned_at"]

    def __str__(self):
        return f"{self.user.email} - {self.project.name} ({self.status})"


class Task(models.Model):
    STATUS_CHOICES = [
        ("قيد التنفيذ", "In Progress"),
        ("في الانتظار", "Waiting"),
        ("مكتملة", "Completed"),
        ("معلقة", "On Hold"),
        ("ملغاة", "Cancelled"),
    ]
    PRIORITY_CHOICES = [
        ("عالية", "High"),
        ("متوسطة", "Medium"),
        ("منخفضة", "Low"),
    ]

    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    project = models.ForeignKey(
        "projects.Project", on_delete=models.CASCADE, related_name="tasks"
    )
    volunteer = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name="assigned_tasks"
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="في الانتظار")
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default="متوسطة")
    due_date = models.DateField(null=True, blank=True)
    hours = models.IntegerField(default=0)
    progress = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "takaful_app_task"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.title} - {self.project.name}"

    def calculate_progress(self):
        subtasks = self.subtasks.all()
        if not subtasks.exists():
            return self.progress
        total = subtasks.count()
        completed = subtasks.filter(completed=True).count()
        return int((completed / total) * 100) if total > 0 else 0


class Subtask(models.Model):
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name="subtasks")
    title = models.CharField(max_length=200)
    completed = models.BooleanField(default=False)
    order = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "takaful_app_subtask"
        ordering = ["order", "created_at"]

    def __str__(self):
        return f"{self.task.title} - {self.title}"


class VolunteerApplication(models.Model):
    STATUS_CHOICES = [
        ("قيد المراجعة", "Under Review"),
        ("مقبول", "Accepted"),
        ("مرفوض", "Rejected"),
    ]

    volunteer = models.ForeignKey(User, on_delete=models.CASCADE, related_name="volunteer_applications")
    project = models.ForeignKey(
        "projects.Project", on_delete=models.CASCADE, related_name="applications"
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="قيد المراجعة")
    message = models.TextField(blank=True)
    admin_notes = models.TextField(blank=True)
    applied_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    reviewed_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name="reviewed_applications"
    )

    class Meta:
        db_table = "takaful_app_volunteerapplication"
        unique_together = ["volunteer", "project"]
        ordering = ["-applied_at"]

    def __str__(self):
        return f"{self.volunteer.email} -> {self.project.name} ({self.status})"
