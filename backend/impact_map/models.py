from django.conf import settings
from django.db import models


class Region(models.Model):
    PRIORITY_CHOICES = [
        ("high", "high"),
        ("medium", "medium"),
        ("low", "low"),
    ]

    name = models.CharField(max_length=120)
    slug = models.SlugField(unique=True)
    center_lat = models.FloatField()
    center_lng = models.FloatField()
    boundary = models.TextField(blank=True, null=True)
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default="medium")
    is_active = models.BooleanField(default=True)
    order = models.IntegerField(default=0)

    class Meta:
        ordering = ["order", "name"]

    def __str__(self):
        return self.name


class Product(models.Model):
    name = models.CharField(max_length=120)
    slug = models.SlugField(unique=True)
    icon = models.CharField(max_length=50, blank=True)
    season = models.CharField(max_length=50, blank=True, null=True)
    target_families = models.IntegerField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    order = models.IntegerField(default=0)

    class Meta:
        ordering = ["order", "name"]

    def __str__(self):
        return self.name


class Outlet(models.Model):
    TYPE_CHOICES = [
        ("sale_point", "sale_point"),
        ("permanent_corner", "permanent_corner"),
        ("participation_point", "participation_point"),
    ]

    name = models.CharField(max_length=120)
    type = models.CharField(max_length=30, choices=TYPE_CHOICES)
    lat = models.FloatField()
    lng = models.FloatField()
    region = models.ForeignKey(Region, null=True, blank=True, on_delete=models.SET_NULL, related_name="outlets")
    address = models.TextField(blank=True)
    working_hours = models.CharField(max_length=200, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class Contribution(models.Model):
    MODE_CHOICES = [
        ("self_distribution", "self_distribution"),
        ("delegate_association", "delegate_association"),
    ]
    STATUS_CHOICES = [
        ("pending", "pending"),
        ("approved", "approved"),
        ("fulfilled", "fulfilled"),
        ("cancelled", "cancelled"),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="impact_contributions",
    )
    name = models.CharField(max_length=150)
    phone = models.CharField(max_length=20)
    region = models.ForeignKey(Region, on_delete=models.PROTECT, related_name="contributions")
    product = models.ForeignKey(Product, on_delete=models.PROTECT, related_name="contributions")
    quantity = models.IntegerField()
    mode = models.CharField(max_length=30, choices=MODE_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    note = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.name} — {self.product.name} ({self.status})"


class DistributionRecord(models.Model):
    region = models.ForeignKey(Region, on_delete=models.CASCADE, related_name="distribution_records")
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="distribution_records")
    families_served = models.IntegerField()
    quantity_distributed = models.IntegerField()
    recorded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="impact_distributions",
    )
    date = models.DateField()

    class Meta:
        ordering = ["-date"]

    def __str__(self):
        return f"{self.region.name} — {self.product.name} ({self.date})"
