from django.db import models
from django.contrib.auth.models import User


class Employee(models.Model):
    """
    موظفو الإدارة (الكادر) — كيان مستقل عن المتطوّع (User/Profile).
    مصدره ورقة DashboardEmployees في المشروع الثاني (GAS).
    يُربط اختيارياً بمستخدم نظام إذا كان للموظف حساب دخول (دور employee).
    """
    user = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="employee_records"
    )
    name = models.CharField(max_length=200)
    role = models.CharField(max_length=150, blank=True)  # المسمى التشغيلي
    completed_tasks = models.IntegerField(default=0)      # DashboardEmployees.completed
    progress = models.IntegerField(default=0)             # 0-100
    icon_key = models.CharField(max_length=50, blank=True)  # مفتاح أيقونة → design-system
    is_active = models.BooleanField(default=True)

    # تتبّع المصدر الخارجي (للمزامنة idempotent مع GAS)
    external_source = models.CharField(max_length=50, blank=True)
    external_id = models.CharField(max_length=100, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-progress', 'name']
        constraints = [
            models.UniqueConstraint(
                fields=['external_source', 'external_id'],
                name='uq_employee_external',
                condition=~models.Q(external_id=''),
            )
        ]
        indexes = [models.Index(fields=['is_active'])]

    def __str__(self):
        return f"{self.name} ({self.role})"


class DashboardSection(models.Model):
    """
    بطاقات الأقسام في اللوحة التنفيذية — مصدرها ورقة DashboardSections (GAS).
    تحفظ نِسَب (واقع/مفترض) وتفصيل حالات الأنشطة.
    """
    title = models.CharField(max_length=200)        # "قسم التكافل المجتمعي"
    unit = models.CharField(max_length=50, blank=True)  # "نشاطًا" | "مبادرة" | "فكرة"
    total = models.IntegerField(default=0)
    actual = models.DecimalField(max_digits=6, decimal_places=2, default=0)    # الواقع %
    expected = models.DecimalField(max_digits=6, decimal_places=2, default=0)  # المفترض %

    # تفصيل حالات الأنشطة
    closed = models.IntegerField(default=0)
    in_progress = models.IntegerField(default=0)
    near = models.IntegerField(default=0)
    late = models.IntegerField(default=0)
    review = models.IntegerField(default=0)
    not_started = models.IntegerField(default=0)

    icon_key = models.CharField(max_length=50, blank=True)  # → design-system
    display_order = models.IntegerField(default=0)

    external_source = models.CharField(max_length=50, blank=True)
    external_id = models.CharField(max_length=100, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['display_order', 'id']
        constraints = [
            models.UniqueConstraint(
                fields=['external_source', 'external_id'],
                name='uq_dashboard_section_external',
                condition=~models.Q(external_id=''),
            )
        ]

    def __str__(self):
        return self.title


class DashboardKpi(models.Model):
    """
    بطاقات مؤشرات الأداء (KPI) في اللوحة التنفيذية — مصدرها ورقة DashboardKpis (GAS).
    القيمة نصّية لاستيعاب صيغ العرض ("268" | "2.4M" | "68%").
    """
    title = models.CharField(max_length=150)
    value = models.CharField(max_length=50)
    subtitle = models.CharField(max_length=150, blank=True)
    icon_key = models.CharField(max_length=50, blank=True)  # → design-system
    display_order = models.IntegerField(default=0)

    external_source = models.CharField(max_length=50, blank=True)
    external_id = models.CharField(max_length=100, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['display_order', 'id']
        constraints = [
            models.UniqueConstraint(
                fields=['external_source', 'external_id'],
                name='uq_dashboard_kpi_external',
                condition=~models.Q(external_id=''),
            )
        ]

    def __str__(self):
        return f"{self.title}: {self.value}"


class StaffTask(models.Model):
    """
    مهام الكادر المنجزة (feed) — مصدرها ورقة DashboardTasks (GAS).
    منفصلة تماماً عن نموذج Task الخاص بالمتطوعين لتجنّب كسر منطقهم.
    """
    title = models.CharField(max_length=200)            # DashboardTasks.task
    employee = models.ForeignKey(
        Employee, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="staff_tasks"
    )
    initiative = models.CharField(max_length=200, blank=True)  # "أضحيتي زاد وإسعاد"
    # ربط اختياري بمشروع موحّد (لدراسة دمج مشاريع GAS مستقبلاً)
    project = models.ForeignKey(
        'takaful_app.Project', on_delete=models.SET_NULL, null=True, blank=True,
        related_name="staff_tasks"
    )
    completed_date = models.DateField(null=True, blank=True)
    progress = models.IntegerField(default=0)

    external_source = models.CharField(max_length=50, blank=True)
    external_id = models.CharField(max_length=100, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-completed_date', '-created_at']
        constraints = [
            models.UniqueConstraint(
                fields=['external_source', 'external_id'],
                name='uq_staff_task_external',
                condition=~models.Q(external_id=''),
            )
        ]

    def __str__(self):
        return self.title
