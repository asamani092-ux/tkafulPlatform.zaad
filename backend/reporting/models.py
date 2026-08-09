"""تقارير وإحصائيات التطوّع — منقولة من volunteering (Phase A4, D-26)."""
from django.contrib.auth.models import User
from django.db import models


class AdminReport(models.Model):
    admin = models.ForeignKey(User, on_delete=models.CASCADE, related_name="generated_reports")
    title = models.CharField(max_length=200)
    date_from = models.DateField(null=True, blank=True)
    date_to = models.DateField(null=True, blank=True)
    report_data = models.JSONField(default=dict)
    total_projects = models.IntegerField(default=0)
    total_volunteers = models.IntegerField(default=0)
    total_tasks = models.IntegerField(default=0)
    total_beneficiaries = models.IntegerField(default=0)
    total_donations = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    generated_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "takaful_app_adminreport"
        ordering = ["-generated_at"]

    def __str__(self):
        return f"{self.title} - {self.generated_at.strftime('%Y-%m-%d %H:%M')}"


class VolunteerStatistics(models.Model):
    year = models.IntegerField(unique=True)
    total_volunteers = models.IntegerField(default=0)
    new_volunteers = models.IntegerField(default=0)
    returning_volunteers = models.IntegerField(default=0)
    total_hours = models.IntegerField(default=0)
    total_contribution_value = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    contribution_value_display = models.CharField(max_length=50, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "takaful_app_volunteerstatistics"
        verbose_name_plural = "Volunteer Statistics"
        ordering = ["-year"]

    def __str__(self):
        return f"Volunteer Statistics {self.year}"


class QuarterlyTarget(models.Model):
    QUARTER_CHOICES = [
        (1, "Q1 - الربع الأول"),
        (2, "Q2 - الربع الثاني"),
        (3, "Q3 - الربع الثالث"),
        (4, "Q4 - الربع الرابع"),
    ]

    statistics = models.ForeignKey(
        VolunteerStatistics, on_delete=models.CASCADE, related_name="quarterly_targets"
    )
    quarter = models.IntegerField(choices=QUARTER_CHOICES)
    volunteer_target = models.IntegerField(default=0)
    volunteer_actual = models.IntegerField(default=0)
    hours_target = models.IntegerField(default=0)
    hours_actual = models.IntegerField(default=0)

    class Meta:
        db_table = "takaful_app_quarterlytarget"
        unique_together = ["statistics", "quarter"]
        ordering = ["quarter"]

    def __str__(self):
        return f"Q{self.quarter} - {self.statistics.year}"


class DepartmentHours(models.Model):
    statistics = models.ForeignKey(
        VolunteerStatistics, on_delete=models.CASCADE, related_name="department_hours"
    )
    department_name = models.CharField(max_length=200)
    department_name_ar = models.CharField(max_length=200)
    hours = models.IntegerField(default=0)
    percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    color = models.CharField(max_length=20, default="#6B1F2B")

    class Meta:
        db_table = "takaful_app_departmenthours"
        ordering = ["-hours"]

    def __str__(self):
        return f"{self.department_name_ar} - {self.hours} hours"


class TopVolunteer(models.Model):
    statistics = models.ForeignKey(
        VolunteerStatistics, on_delete=models.CASCADE, related_name="top_volunteers"
    )
    rank = models.IntegerField()
    name = models.CharField(max_length=200)
    hours = models.IntegerField(default=0)
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)

    class Meta:
        db_table = "takaful_app_topvolunteer"
        unique_together = ["statistics", "rank"]
        ordering = ["rank"]

    def __str__(self):
        return f"#{self.rank} {self.name} - {self.hours} hours"
