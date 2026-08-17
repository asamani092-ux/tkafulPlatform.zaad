"""خدمات المنصّة — منقولة من volunteering (Phase A4, D-26). db_table يبقى takaful_app_*."""
from django.contrib.auth.models import User
from django.db import models


class Service(models.Model):
    STATUS_CHOICES = [
        ("متاحة", "متاحة"),
        ("قادمة", "قادمة"),
        ("مكتملة", "مكتملة"),
    ]
    SERVICE_TYPE_CHOICES = [
        ("للمستفيدين", "للمستفيدين"),
        ("للمتطوعين", "للمتطوعين"),
    ]

    title = models.CharField(max_length=200)
    desc = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="متاحة")
    service_type = models.CharField(max_length=20, choices=SERVICE_TYPE_CHOICES, default="للمتطوعين")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "takaful_app_service"

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

    class Meta:
        db_table = "takaful_app_servicerequest"

    def __str__(self):
        return f"{self.service.title} for {self.beneficiary_name}"


class ServiceVolunteerApplication(models.Model):
    STATUS_CHOICES = [
        ("قيد المراجعة", "Under Review"),
        ("مقبول", "Accepted"),
        ("مرفوض", "Rejected"),
    ]

    volunteer = models.ForeignKey(User, on_delete=models.CASCADE, related_name="service_applications")
    service = models.ForeignKey(Service, on_delete=models.CASCADE, related_name="volunteer_applications")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="قيد المراجعة")
    message = models.TextField(blank=True)
    admin_notes = models.TextField(blank=True)
    applied_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    reviewed_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="reviewed_service_applications",
    )

    class Meta:
        db_table = "takaful_app_servicevolunteerapplication"
        unique_together = ["volunteer", "service"]
        ordering = ["-applied_at"]

    def __str__(self):
        return f"{self.volunteer.email} - {self.service.title} ({self.status})"


class Suggestion(models.Model):
    title = models.CharField(max_length=200)
    description = models.TextField()
    submitted_by = models.CharField(max_length=150, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    is_reviewed = models.BooleanField(default=False)

    class Meta:
        db_table = "takaful_app_suggestion"

    def __str__(self):
        return self.title


class WaterSupplyRequest(models.Model):
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

    applicant_name = models.CharField(max_length=200)
    mobile_number = models.CharField(max_length=20)
    applicant_role = models.CharField(max_length=50, choices=APPLICANT_ROLE_CHOICES)
    mosque_name = models.CharField(max_length=200)
    neighborhood = models.CharField(max_length=200)
    location_link = models.URLField(max_length=500)
    worshippers_count = models.IntegerField()
    donor_exists = models.BooleanField(default=False)
    donor_name = models.CharField(max_length=200, blank=True)
    donor_phone = models.CharField(max_length=20, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="PENDING")
    admin_notes = models.TextField(blank=True)
    project = models.ForeignKey(
        "projects.Project",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="water_supply_requests",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "takaful_app_watersupplyrequest"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.mosque_name} - {self.applicant_name}"
