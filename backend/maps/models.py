"""
نظام الخرائط المتعددة — خريطة قابلة للتهيئة لكل مشروع:
- Map: هوية الخريطة وظهورها (public/private/mixed).
- MapLayer: طبقات بظهور مستقل (يمكّن الخرائط المختلطة).
- MapItemField: المخطط الديناميكي لحقول عناصر الخريطة (مع is_public لكل حقل).
- MapItem: عنصر جغرافي؛ بياناته الديناميكية في data وتُتحقّق ضد MapItemField.
- MapContribution: مساهمات الجمهور مرتبطة بالخريطة (مهاجرة من impact_map).
"""
from django.conf import settings
from django.db import models


class Map(models.Model):
    VISIBILITY_CHOICES = [
        ("public", "public"),
        ("private", "private"),
        ("mixed", "mixed"),
    ]

    project = models.ForeignKey(
        "projects.Project", on_delete=models.CASCADE, related_name="maps"
    )
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    visibility = models.CharField(max_length=10, choices=VISIBILITY_CHOICES, default="public")
    icon_set = models.JSONField(default=dict, blank=True)
    color_scheme = models.JSONField(default=dict, blank=True)
    published_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="created_maps",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["project", "title"]
        indexes = [models.Index(fields=["project", "visibility"])]

    def __str__(self):
        return f"{self.title} ({self.project.slug})"

    # ---- fat model ----
    @property
    def is_publicly_listed(self) -> bool:
        return self.visibility in ("public", "mixed") and self.published_at is not None

    def public_layers(self):
        return self.layers.filter(visibility="public")

    def public_fields(self):
        return self.item_fields.filter(is_public=True)


class MapLayer(models.Model):
    VISIBILITY_CHOICES = [("public", "public"), ("private", "private")]

    map = models.ForeignKey(Map, on_delete=models.CASCADE, related_name="layers")
    name = models.CharField(max_length=120)
    visibility = models.CharField(max_length=10, choices=VISIBILITY_CHOICES, default="public")
    order = models.IntegerField(default=0)
    style = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["map", "order", "name"]
        indexes = [models.Index(fields=["map", "visibility"])]

    def __str__(self):
        return f"{self.map_id}:{self.name} ({self.visibility})"


class MapItemField(models.Model):
    TYPE_CHOICES = [
        ("text", "text"),
        ("number", "number"),
        ("select", "select"),
        ("boolean", "boolean"),
        ("date", "date"),
    ]

    map = models.ForeignKey(Map, on_delete=models.CASCADE, related_name="item_fields")
    key = models.SlugField(max_length=60)
    label = models.CharField(max_length=120)
    type = models.CharField(max_length=10, choices=TYPE_CHOICES, default="text")
    required = models.BooleanField(default=False)
    options = models.JSONField(default=list, blank=True)  # لقوائم select
    is_public = models.BooleanField(default=True)
    order = models.IntegerField(default=0)

    class Meta:
        ordering = ["map", "order", "key"]
        constraints = [
            models.UniqueConstraint(fields=["map", "key"], name="uq_map_field_key")
        ]
        indexes = [models.Index(fields=["map", "is_public"])]

    def __str__(self):
        return f"{self.map_id}:{self.key} ({self.type})"


class MapItem(models.Model):
    STATUS_CHOICES = [
        ("active", "active"),
        ("hidden", "hidden"),
        ("archived", "archived"),
    ]

    map = models.ForeignKey(Map, on_delete=models.CASCADE, related_name="items")
    layer = models.ForeignKey(MapLayer, on_delete=models.CASCADE, related_name="items")
    lat = models.FloatField()
    lng = models.FloatField()
    name = models.CharField(max_length=200)
    icon = models.CharField(max_length=50, blank=True)
    # الحقول الديناميكية — تُتحقّق ضد MapItemField في services.validate_item_data
    data = models.JSONField(default=dict, blank=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default="active")
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="created_map_items",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["map", "layer", "name"]
        indexes = [
            models.Index(fields=["map", "status"]),
            models.Index(fields=["layer", "status"]),
        ]

    def __str__(self):
        return f"{self.name} @ map {self.map_id}"


class MapContribution(models.Model):
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

    map = models.ForeignKey(Map, on_delete=models.CASCADE, related_name="contributions")
    # ربط اختياري بعنصر خريطة (منطقة مثلاً) وبُعد تصنيفي حر (منتج…)
    item = models.ForeignKey(
        MapItem, null=True, blank=True, on_delete=models.SET_NULL, related_name="contributions"
    )
    category = models.CharField(max_length=120, blank=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="map_contributions",
    )
    name = models.CharField(max_length=150)
    phone = models.CharField(max_length=20)
    mode = models.CharField(max_length=30, choices=MODE_CHOICES)
    quantity = models.IntegerField()
    note = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    # وسم المصدر للمزامنة التراكمية (impact_map:<id>) — يمنع التكرار عند إعادة التشغيل
    external_id = models.CharField(max_length=100, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["map", "status"]),
            models.Index(fields=["map", "external_id"]),
        ]

    def __str__(self):
        return f"{self.name} — map {self.map_id} ({self.status})"


class MapProduct(models.Model):
    """كتالوج المنتجات لكل خريطة (مصدر الحقيقة بعد Phase A1 — بديل impact_map.Product)."""

    map = models.ForeignKey(Map, on_delete=models.CASCADE, related_name="products")
    name = models.CharField(max_length=120)
    slug = models.SlugField(max_length=120)
    icon = models.CharField(max_length=50, blank=True)
    season = models.CharField(max_length=50, blank=True, null=True)
    target_families = models.IntegerField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    order = models.IntegerField(default=0)
    external_id = models.CharField(max_length=100, blank=True, default="")

    class Meta:
        ordering = ["map", "order", "name"]
        constraints = [
            models.UniqueConstraint(fields=["map", "slug"], name="uq_map_product_slug"),
        ]
        indexes = [models.Index(fields=["map", "is_active"])]

    def __str__(self):
        return f"{self.name} ({self.map_id})"


class MapDistributionRecord(models.Model):
    """سجلات التوزيع لكل خريطة (بديل impact_map.DistributionRecord)."""

    map = models.ForeignKey(Map, on_delete=models.CASCADE, related_name="distribution_records")
    region_item = models.ForeignKey(
        MapItem, on_delete=models.CASCADE, related_name="distribution_records"
    )
    product = models.ForeignKey(
        MapProduct, on_delete=models.CASCADE, related_name="distribution_records"
    )
    families_served = models.IntegerField()
    quantity_distributed = models.IntegerField()
    recorded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="map_distributions",
    )
    date = models.DateField()
    external_id = models.CharField(max_length=100, blank=True, default="")

    class Meta:
        ordering = ["-date"]
        indexes = [
            models.Index(fields=["map", "date"]),
            models.Index(fields=["map", "external_id"]),
        ]

    def __str__(self):
        return f"{self.region_item.name} — {self.product.name} ({self.date})"
