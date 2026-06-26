from django.db import models
from django.contrib.auth.models import User 


class Project(models.Model):
    STATUS_CHOICES = [
        ("PLANNED", "Planned"),
        ("ACTIVE", "Active"),
        ("COMPLETED", "Completed"),
        ("CANCELLED", "Cancelled"),
    ]

    # Basic Information
    title = models.CharField(max_length=200)
    desc = models.TextField(blank=True)
    category = models.CharField(max_length=50, blank=True)  # أساسي, مجتمعي, مؤسسي

    # Target & Impact
    target_audience = models.CharField(max_length=200, blank=True)  # الفئة المستهدفة
    beneficiaries = models.IntegerField(default=0)

    # Location
    location = models.CharField(max_length=200, blank=True)

    # Financial
    donation_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)  # مبلغ التبرع

    # Timeline
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)

    # Planning Details
    implementation_requirements = models.TextField(blank=True)  # متطلبات التنفيذ
    project_goals = models.TextField(blank=True)  # أهداف المشروع

    # Volunteer Management
    estimated_hours = models.IntegerField(default=0)
    supervisor = models.CharField(max_length=200, blank=True)
    duration = models.CharField(max_length=100, blank=True)

    # NEW FIELDS FOR ADMIN DASHBOARD
    tags = models.JSONField(default=list, blank=True)  # ["متوسطة", "تسويق"]
    progress = models.IntegerField(default=0)  # 0-100 percentage
    organization = models.CharField(max_length=200, blank=True)  # "جمعية تمكين"
    hours = models.CharField(max_length=50, blank=True)  # "40 ساعة"
    is_hidden = models.BooleanField(default=False)  # Hide/show project in public views

    # Status & Tracking
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="PLANNED")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.title


class Service(models.Model):
    STATUS_CHOICES = [
        ("متاحة", "متاحة"),
        ("قادمة", "قادمة"),
        ("مكتملة", "مكتملة"),
    ]

    SERVICE_TYPE_CHOICES = [
        ("للمستفيدين", "للمستفيدين"),  # For beneficiaries (main page)
        ("للمتطوعين", "للمتطوعين"),    # For volunteers (/services page)
    ]

    title = models.CharField(max_length=200)
    desc = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="متاحة")
    service_type = models.CharField(max_length=20, choices=SERVICE_TYPE_CHOICES, default="للمتطوعين")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title


class ServiceRequest(models.Model):
    STATUS_CHOICES = [
        ("PENDING", "Pending"),
        ("APPROVED", "Approved"),
        ("REJECTED", "Rejected"),
        ("DONE", "Done"),
    ]

    service = models.ForeignKey(Service, on_delete=models.CASCADE, related_name="requests")
    beneficiary_name = models.CharField(max_length=200)
    beneficiary_contact = models.CharField(max_length=200, blank=True)
    details = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="PENDING")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.service.title} for {self.beneficiary_name}"


class ServiceVolunteerApplication(models.Model):
    """
    Volunteer applications to services
    When volunteers apply to help with a service, an application is created
    Admin reviews and accepts/rejects applications
    """
    STATUS_CHOICES = [
        ("قيد المراجعة", "Under Review"),
        ("مقبول", "Accepted"),
        ("مرفوض", "Rejected"),
    ]

    volunteer = models.ForeignKey(User, on_delete=models.CASCADE, related_name="service_applications")
    service = models.ForeignKey(Service, on_delete=models.CASCADE, related_name="volunteer_applications")

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="قيد المراجعة")
    message = models.TextField(blank=True)  # Optional message from volunteer
    admin_notes = models.TextField(blank=True)  # Notes from admin during review

    applied_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    reviewed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="reviewed_service_applications")

    class Meta:
        unique_together = ['volunteer', 'service']
        ordering = ['-applied_at']

    def __str__(self):
        return f"{self.volunteer.email} - {self.service.title} ({self.status})"


class Volunteer(models.Model):
    full_name = models.CharField(max_length=200)
    phone = models.CharField(max_length=50, blank=True)
    email = models.EmailField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.full_name


class Suggestion(models.Model):
    title = models.CharField(max_length=200)
    description = models.TextField()
    submitted_by = models.CharField(max_length=150, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    is_reviewed = models.BooleanField(default=False)

    def __str__(self):
        return self.title


class ProjectAssignment(models.Model):
    """
    Assign projects to users (volunteers)
    Links User (from accounts) to Project
    """
    STATUS_CHOICES = [
        ("جديدة", "New"),
        ("قيد التنفيذ", "In Progress"),
        ("معلقة", "On Hold"),
        ("مكتملة", "Completed"),
        ("ملغية", "Cancelled"),
    ]
    
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="assignments")
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="project_assignments")
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="جديدة")
    assigned_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    hours_contributed = models.IntegerField(default=0)
    progress = models.IntegerField(default=0)  # 0-100
    notes = models.TextField(blank=True)
    
    class Meta:
        unique_together = ['project', 'user']
        ordering = ['-assigned_at']
    
    def __str__(self):
        return f"{self.user.email} - {self.project.title} ({self.status})"


class Task(models.Model):
    """
    Tasks assigned to volunteers within projects
    Used in VolunteerManagement page
    """
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
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="tasks")
    volunteer = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="assigned_tasks")
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="في الانتظار")
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default="متوسطة")
    
    due_date = models.DateField(null=True, blank=True)
    hours = models.IntegerField(default=0)  # Estimated hours
    progress = models.IntegerField(default=0)  # 0-100, auto-calculated from subtasks
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.title} - {self.project.title}"
    
    def calculate_progress(self):
        """Calculate progress based on completed subtasks"""
        subtasks = self.subtasks.all()
        if not subtasks.exists():
            return self.progress
        
        total = subtasks.count()
        completed = subtasks.filter(completed=True).count()
        return int((completed / total) * 100) if total > 0 else 0


class Subtask(models.Model):
    """
    Subtasks for breaking down tasks into smaller pieces
    """
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name="subtasks")
    title = models.CharField(max_length=200)
    completed = models.BooleanField(default=False)
    order = models.IntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['order', 'created_at']

    def __str__(self):
        return f"{self.task.title} - {self.title}"


class AdminReport(models.Model):
    """
    Generated reports for admin dashboard
    Stores comprehensive platform statistics and data snapshots
    """
    # Who generated this report
    admin = models.ForeignKey(User, on_delete=models.CASCADE, related_name="generated_reports")

    # Report metadata
    title = models.CharField(max_length=200)  # e.g., "تقرير شامل - 2026-01-10"

    # Date range filters (optional)
    date_from = models.DateField(null=True, blank=True)
    date_to = models.DateField(null=True, blank=True)

    # Complete report data stored as JSON
    report_data = models.JSONField(default=dict)

    # Quick stats for listing (duplicated for performance)
    total_projects = models.IntegerField(default=0)
    total_volunteers = models.IntegerField(default=0)
    total_tasks = models.IntegerField(default=0)
    total_beneficiaries = models.IntegerField(default=0)
    total_donations = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    # Timestamps
    generated_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-generated_at']

    def __str__(self):
        return f"{self.title} - {self.generated_at.strftime('%Y-%m-%d %H:%M')}"


class VolunteerApplication(models.Model):
    """
    Volunteer applications to projects
    When volunteers apply to join a project, an application is created
    Admin reviews and accepts/rejects applications
    Upon acceptance, a Task is created for the volunteer
    """
    STATUS_CHOICES = [
        ("قيد المراجعة", "Under Review"),  # Pending
        ("مقبول", "Accepted"),
        ("مرفوض", "Rejected"),
    ]

    volunteer = models.ForeignKey(User, on_delete=models.CASCADE, related_name="volunteer_applications")
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="applications")

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="قيد المراجعة")
    message = models.TextField(blank=True)  # Optional message from volunteer
    admin_notes = models.TextField(blank=True)  # Notes from admin during review

    applied_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    reviewed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="reviewed_applications")

    class Meta:
        unique_together = ['volunteer', 'project']  # One application per volunteer per project
        ordering = ['-applied_at']

    def __str__(self):
        return f"{self.volunteer.email} -> {self.project.title} ({self.status})"


class VolunteerStatistics(models.Model):
    """
    Yearly volunteer statistics for the dashboard
    """
    year = models.IntegerField(unique=True)

    # Volunteer counts
    total_volunteers = models.IntegerField(default=0)
    new_volunteers = models.IntegerField(default=0)
    returning_volunteers = models.IntegerField(default=0)

    # Hours
    total_hours = models.IntegerField(default=0)

    # Value
    total_contribution_value = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    contribution_value_display = models.CharField(max_length=50, blank=True)  # e.g., "1.03M"

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "Volunteer Statistics"
        ordering = ['-year']

    def __str__(self):
        return f"Volunteer Statistics {self.year}"


class QuarterlyTarget(models.Model):
    """
    Quarterly targets for volunteers and hours
    """
    QUARTER_CHOICES = [
        (1, "Q1 - الربع الأول"),
        (2, "Q2 - الربع الثاني"),
        (3, "Q3 - الربع الثالث"),
        (4, "Q4 - الربع الرابع"),
    ]

    statistics = models.ForeignKey(VolunteerStatistics, on_delete=models.CASCADE, related_name="quarterly_targets")
    quarter = models.IntegerField(choices=QUARTER_CHOICES)

    volunteer_target = models.IntegerField(default=0)
    volunteer_actual = models.IntegerField(default=0)

    hours_target = models.IntegerField(default=0)
    hours_actual = models.IntegerField(default=0)

    class Meta:
        unique_together = ['statistics', 'quarter']
        ordering = ['quarter']

    def __str__(self):
        return f"Q{self.quarter} - {self.statistics.year}"


class DepartmentHours(models.Model):
    """
    Hours distribution by department
    """
    statistics = models.ForeignKey(VolunteerStatistics, on_delete=models.CASCADE, related_name="department_hours")

    department_name = models.CharField(max_length=200)
    department_name_ar = models.CharField(max_length=200)
    hours = models.IntegerField(default=0)
    percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    color = models.CharField(max_length=20, default="#6B1F2B")  # For chart display

    class Meta:
        ordering = ['-hours']

    def __str__(self):
        return f"{self.department_name_ar} - {self.hours} hours"


class TopVolunteer(models.Model):
    """
    Top volunteers by hours for a given year
    """
    statistics = models.ForeignKey(VolunteerStatistics, on_delete=models.CASCADE, related_name="top_volunteers")

    rank = models.IntegerField()
    name = models.CharField(max_length=200)
    hours = models.IntegerField(default=0)

    # Optional link to actual volunteer user
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)

    class Meta:
        unique_together = ['statistics', 'rank']
        ordering = ['rank']

    def __str__(self):
        return f"#{self.rank} {self.name} - {self.hours} hours"


class WaterSupplyRequest(models.Model):
    """
    Water supply requests for mosques (سقيا الماء)
    Public form submission - no authentication required
    """
    STATUS_CHOICES = [
        ("PENDING", "قيد المراجعة"),
        ("APPROVED", "مقبول"),
        ("REJECTED", "مرفوض"),
        ("COMPLETED", "مكتمل"),
    ]

    APPLICANT_ROLE_CHOICES = [
        ("إمام", "إمام"),
        ("مؤذن", "مؤذن"),
        ("غير ذلك", "غير ذلك"),
    ]

    # Applicant Information
    applicant_name = models.CharField(max_length=200)
    mobile_number = models.CharField(max_length=20)
    applicant_role = models.CharField(max_length=50, choices=APPLICANT_ROLE_CHOICES)

    # Mosque Information
    mosque_name = models.CharField(max_length=200)
    neighborhood = models.CharField(max_length=200)
    location_link = models.URLField(max_length=500)
    worshippers_count = models.IntegerField()

    # Donor Information
    donor_exists = models.BooleanField(default=False)
    donor_name = models.CharField(max_length=200, blank=True)
    donor_phone = models.CharField(max_length=20, blank=True)

    # Status & Tracking
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="PENDING")
    admin_notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.mosque_name} - {self.applicant_name}"