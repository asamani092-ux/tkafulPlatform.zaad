"""
نماذج وحدة «كفالات السقيا» (saqya) — مترجمة من خلفية Flask/SQLAlchemy إلى Django ORM.
وحدة مستقلة داخل المنصّة الموحّدة؛ تستخدم الهوية المركزية (auth_user + accounts.Profile)
ومصادقة SimpleJWT. تتعايش مع takaful_app.WaterSupplyRequest دون مساس.

ملفات الفواتير/التوثيق تُخزَّن في مسار خاص (private/) ولا تُقدَّم عبر MEDIA_URL العام،
بل عبر view مصادق يتحقّق من الدور/الملكية (انظر views.py).
"""
from django.db import models
from django.db.models import Sum
from django.contrib.auth.models import User


# ============ ملفات الأدوار (مرتبطة بالمستخدم الموحّد) ============
class SupplierProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="supplier_profile")
    business_name = models.CharField(max_length=200)
    specialization = models.CharField(max_length=100, blank=True)
    address = models.TextField(blank=True)
    rating = models.FloatField(default=0.0)
    total_orders = models.IntegerField(default=0)
    completed_orders = models.IntegerField(default=0)
    external_source = models.CharField(max_length=50, blank=True)
    external_id = models.CharField(max_length=100, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.business_name


class RepresentativeProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="representative_profile")
    area = models.CharField(max_length=100, blank=True)
    active_orders = models.IntegerField(default=0)
    total_completed = models.IntegerField(default=0)
    rating = models.FloatField(default=0.0)
    external_source = models.CharField(max_length=50, blank=True)
    external_id = models.CharField(max_length=100, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Representative {self.user_id} ({self.area})"


# ============ الكفالة ============
class Sponsorship(models.Model):
    STATUS_CHOICES = [
        ("pending", "pending"), ("approved", "approved"), ("rejected", "rejected"),
        ("in_progress", "in_progress"), ("completed", "completed"), ("cancelled", "cancelled"),
    ]
    PRIORITY_CHOICES = [("urgent", "urgent"), ("high", "high"), ("normal", "normal"), ("low", "low")]

    donor = models.ForeignKey(User, on_delete=models.CASCADE, related_name="saqya_sponsorships")
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    type = models.CharField(max_length=50)
    description = models.TextField(blank=True)
    location = models.CharField(max_length=200, blank=True)
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    beneficiaries_count = models.IntegerField(default=1)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default="normal")
    target_date = models.DateTimeField(null=True, blank=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    funded_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    admin_notes = models.TextField(blank=True)
    rejection_reason = models.TextField(blank=True)
    external_source = models.CharField(max_length=50, blank=True)
    external_id = models.CharField(max_length=100, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["status"]), models.Index(fields=["donor"])]
        constraints = [
            models.UniqueConstraint(
                fields=["external_source", "external_id"],
                name="uq_saqya_sponsorship_external",
                condition=~models.Q(external_id=""),
            )
        ]

    def __str__(self):
        return f"Sponsorship {self.id} - {self.type} - {self.status}"

    # ---- التجميع المالي ----
    @property
    def total_funded(self):
        """مجموع الدفعات المكتملة لهذه الكفالة."""
        return self.payments.filter(status="completed").aggregate(s=Sum("amount"))["s"] or 0

    @property
    def remaining(self):
        return float(self.amount) - float(self.total_funded)

    @property
    def is_fully_funded(self):
        return float(self.total_funded) >= float(self.amount)


# ============ الطلب (توريد/تنفيذ) ============
class Order(models.Model):
    STATUS_CHOICES = [
        ("pending", "pending"), ("assigned", "assigned"), ("preparing", "preparing"),
        ("ready", "ready"), ("delivered", "delivered"), ("completed", "completed"), ("cancelled", "cancelled"),
    ]

    sponsorship = models.ForeignKey(Sponsorship, on_delete=models.CASCADE, related_name="orders")
    supplier = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="saqya_supplier_orders")
    representative = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="saqya_representative_orders")

    items = models.JSONField(default=list, blank=True)
    estimated_cost = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    actual_cost = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")

    assigned_at = models.DateTimeField(null=True, blank=True)
    preparation_started_at = models.DateTimeField(null=True, blank=True)
    ready_at = models.DateTimeField(null=True, blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    supplier_notes = models.TextField(blank=True)
    representative_notes = models.TextField(blank=True)
    admin_notes = models.TextField(blank=True)
    external_source = models.CharField(max_length=50, blank=True)
    external_id = models.CharField(max_length=100, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["status"]), models.Index(fields=["supplier"]), models.Index(fields=["representative"])]

    def __str__(self):
        return f"Order {self.id} - Sponsorship {self.sponsorship_id} - {self.status}"


def invoice_upload_path(instance, filename):
    return f"private/saqya/invoices/{filename}"


def documentation_upload_path(instance, filename):
    return f"private/saqya/documentation/{filename}"


# ============ الفاتورة (ملف خاص) ============
class Invoice(models.Model):
    STATUS_CHOICES = [("pending", "pending"), ("approved", "approved"), ("rejected", "rejected"), ("paid", "paid")]

    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="invoices")
    invoice_number = models.CharField(max_length=50, unique=True)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    tax_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    file = models.FileField(upload_to=invoice_upload_path, null=True, blank=True)  # خاص
    issue_date = models.DateTimeField(auto_now_add=True)
    due_date = models.DateTimeField(null=True, blank=True)
    paid_date = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)
    rejection_reason = models.TextField(blank=True)
    external_source = models.CharField(max_length=50, blank=True)
    external_id = models.CharField(max_length=100, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Invoice {self.invoice_number} - {self.status}"


# ============ الدفع ============
class Payment(models.Model):
    METHOD_CHOICES = [("credit_card", "credit_card"), ("bank_transfer", "bank_transfer"), ("cash", "cash"), ("online", "online")]
    STATUS_CHOICES = [("pending", "pending"), ("completed", "completed"), ("failed", "failed"), ("refunded", "refunded")]

    sponsorship = models.ForeignKey(Sponsorship, on_delete=models.CASCADE, related_name="payments")
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    method = models.CharField(max_length=50, choices=METHOD_CHOICES)
    transaction_id = models.CharField(max_length=100, blank=True)
    reference_number = models.CharField(max_length=100, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    payment_date = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(blank=True)
    failure_reason = models.TextField(blank=True)
    external_source = models.CharField(max_length=50, blank=True)
    external_id = models.CharField(max_length=100, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-payment_date"]

    def __str__(self):
        return f"Payment {self.id} - {self.amount} - {self.status}"


# ============ التوثيق الميداني (ملف خاص + GPS) ============
class Documentation(models.Model):
    TYPE_CHOICES = [("photo", "photo"), ("video", "video"), ("document", "document"), ("receipt", "receipt")]

    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="documentation")
    type = models.CharField(max_length=50, choices=TYPE_CHOICES)
    title = models.CharField(max_length=200, blank=True)
    description = models.TextField(blank=True)
    file = models.FileField(upload_to=documentation_upload_path)  # خاص
    file_name = models.CharField(max_length=200, blank=True)
    file_size = models.IntegerField(null=True, blank=True)
    mime_type = models.CharField(max_length=100, blank=True)
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    location_name = models.CharField(max_length=200, blank=True)
    approved = models.BooleanField(default=False)  # اعتماد المشرف للتوثيق
    uploaded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name="saqya_uploads")
    upload_date = models.DateTimeField(auto_now_add=True)
    external_source = models.CharField(max_length=50, blank=True)
    external_id = models.CharField(max_length=100, blank=True)

    class Meta:
        ordering = ["-upload_date"]

    def __str__(self):
        return f"Doc {self.id} - {self.type} - order {self.order_id}"
