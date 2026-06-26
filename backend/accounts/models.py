from django.db import models
from django.contrib.auth.models import User


class Profile(models.Model):
    ROLE_CHOICES = [
        ("admin", "Admin"),
        ("manager", "Manager"),
        ("user", "User"),          # متطوّع (يبقى كما هو لعدم كسر الاستعلامات القائمة)
        ("employee", "Employee"),  # موظف/كادر له دخول (من المشروع الثاني)
        ("beneficiary", "Beneficiary"),  # مستفيد (مستقبلاً)
    ]

    GENDER_CHOICES = [
        ("ذكر", "Male"),
        ("أنثى", "Female"),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default="user")
    
    # Basic Info
    name = models.CharField(max_length=150, blank=True)
    phone = models.CharField(max_length=30, blank=True)
    city = models.CharField(max_length=100, blank=True)
    gender = models.CharField(max_length=10, choices=GENDER_CHOICES, blank=True)
    age = models.IntegerField(null=True, blank=True)
    qualification = models.CharField(max_length=100, blank=True)
    
    # Education
    university = models.CharField(max_length=200, blank=True)
    specialization = models.CharField(max_length=200, blank=True)
    
    # Volunteer Stats
    total_volunteer_hours = models.IntegerField(default=0)
    completed_tasks_count = models.IntegerField(default=0)
    rating = models.FloatField(default=0.0)
    points = models.IntegerField(default=0)
    
    # Arrays
    skills = models.JSONField(default=list, blank=True)
    available_days = models.JSONField(default=list, blank=True)
    
    # ✅ ADD THIS NEW FIELD:
    is_approved = models.BooleanField(default=False)  # Track if volunteer is approved

    # حقول موحّدة من المشروع الثاني (GAS) + استيراد Excel
    national_id = models.CharField(max_length=20, blank=True)  # رقم الهوية
    region = models.CharField(max_length=100, blank=True)      # المنطقة
    must_reset_password = models.BooleanField(default=False)   # إجبار إعادة التعيين بعد ترحيل GAS
    external_source = models.CharField(max_length=50, blank=True)  # 'gas' | 'excel' | 'web'
    external_id = models.CharField(max_length=100, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.email} ({self.role})"

    class Meta:
        ordering = ['-created_at']