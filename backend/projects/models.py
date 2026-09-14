"""
تطبيق «المشاريع» — المشروع كيان أول (project-first).
المشروع له هوية ثابتة (اسم/وصف/هوية بصرية/تواريخ/فريق/حالة) وأدوات قابلة
للتفعيل (خريطة، كفالات، تطوّع، خدمات، تقارير) عبر ProjectTool.
"""
from django.conf import settings
from django.db import models

from .validators import validate_https_donation_url


class ProjectType(models.Model):
    """نوع/تصنيف المشروع — جدول قابل للتوسّع (ليس enum ثابتاً)."""

    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=100, unique=True, allow_unicode=True)
    is_active = models.BooleanField(default=True)
    order = models.PositiveIntegerField(default=0, help_text="ترتيب العرض (الأصغر أولاً)")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["order", "name"]

    def __str__(self):
        return self.name


class Project(models.Model):
    STATUS_CHOICES = [
        ("draft", "draft"),
        ("active", "active"),
        ("completed", "completed"),
        ("archived", "archived"),
    ]

    name = models.CharField(max_length=200)
    slug = models.SlugField(unique=True, allow_unicode=True)
    description = models.TextField(blank=True)
    # الهوية البصرية (ألوان Design_system_f الافتراضية)
    brand_color = models.CharField(max_length=20, default="#8b1538")
    # رابط صورة الغلاف (URL) — لا اعتماد على Pillow (انظر DECISIONS.md D-13)
    cover_image = models.URLField(blank=True)
    donation_url = models.URLField(
        blank=True,
        validators=[validate_https_donation_url],
        help_text="رابط تبرع خاص بالمشروع (HTTPS فقط)",
    )
    donation_label = models.CharField(max_length=100, blank=True, default="تبرع الآن")
    type = models.ForeignKey(
        ProjectType,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="projects",
        help_text="نوع المشروع (اختياري، قابل للتوسّع من الإعدادات)",
    )
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="active")
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="created_platform_projects",
    )
    is_active = models.BooleanField(default=True)
    is_featured = models.BooleanField(
        default=False,
        help_text="عرض في قسم المشاريع النشطة بالصفحة الرئيسية",
    )
    featured_order = models.PositiveIntegerField(
        default=0,
        help_text="ترتيب العرض بين المشاريع المميزة (الأصغر أولاً)",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]
        indexes = [
            models.Index(fields=["is_active", "status"]),
            models.Index(fields=["is_featured", "featured_order"]),
        ]

    def __str__(self):
        return self.name

    # ---- fat model: استعلامات الأدوات ----
    def enabled_tool_keys(self):
        """مفاتيح الأدوات المفعّلة — O(T) حيث T عدد أدوات المشروع (تُجلب prefetch)."""
        return [t.tool_key for t in self.tools.all() if t.is_enabled]

    def has_tool(self, key: str) -> bool:
        return self.tools.filter(tool_key=key, is_enabled=True).exists()


class ProjectMember(models.Model):
    ROLE_CHOICES = [
        ("project_admin", "project_admin"),
        ("project_editor", "project_editor"),
        ("project_viewer", "project_viewer"),
    ]

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="members")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="project_memberships"
    )
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default="project_viewer")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["project", "user"]
        constraints = [
            models.UniqueConstraint(fields=["project", "user"], name="uq_project_member")
        ]
        indexes = [models.Index(fields=["user", "role"])]

    def __str__(self):
        return f"{self.user_id} @ {self.project.slug} ({self.role})"


class ProjectTool(models.Model):
    TOOL_CHOICES = [
        ("map", "map"),
        ("sponsorships", "sponsorships"),
        ("volunteering", "volunteering"),
        ("services", "services"),
        ("reports", "reports"),
    ]

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="tools")
    tool_key = models.CharField(max_length=30, choices=TOOL_CHOICES)
    config = models.JSONField(default=dict, blank=True)
    is_enabled = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["project", "tool_key"]
        constraints = [
            models.UniqueConstraint(fields=["project", "tool_key"], name="uq_project_tool")
        ]

    def __str__(self):
        return f"{self.project.slug}:{self.tool_key} ({'on' if self.is_enabled else 'off'})"


class ProjectAllowedSupplier(models.Model):
    """مورّدون مسموح إسنادهم ضمن مشروع — قائمة فارغة = بلا قيد."""

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="allowed_supplier_links")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="project_supplier_allowances"
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["project", "user"], name="uq_project_allowed_supplier"),
        ]

    def __str__(self):
        return f"supplier {self.user_id} @ {self.project_id}"


class ProjectAllowedRepresentative(models.Model):
    """مندوبون مسموح إسنادهم ضمن مشروع — قائمة فارغة = بلا قيد."""

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="allowed_representative_links")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="project_representative_allowances"
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["project", "user"], name="uq_project_allowed_representative"),
        ]

    def __str__(self):
        return f"representative {self.user_id} @ {self.project_id}"

