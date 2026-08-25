from django.db import models

from .validators import validate_https_url, validate_phone


class PlatformSetting(models.Model):
    """صف واحد لإعدادات تشغيل المنصّة (singleton pk=1)."""

    platform_name = models.CharField(max_length=150, default="تكافل وأثر")
    logo_url = models.URLField(blank=True)
    contact_email = models.EmailField(blank=True, default="info@takafol-athar.com")
    contact_phone = models.CharField(max_length=40, blank=True, default="+966 50 123 4567")
    address = models.CharField(max_length=255, blank=True, default="القصيم، المملكة العربية السعودية")
    social_links = models.JSONField(default=dict, blank=True)
    show_map = models.BooleanField(default=True)
    show_services = models.BooleanField(default=True)
    show_volunteering = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "إعدادات المنصّة"

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)

    def clean(self):
        validate_https_url(self.logo_url, "شعار المنصّة")
        validate_phone(self.contact_phone)
        links = self.social_links if isinstance(self.social_links, dict) else {}
        for key, url in links.items():
            if url:
                validate_https_url(str(url), f"رابط {key}")

    @classmethod
    def load(cls) -> "PlatformSetting":
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj

    def __str__(self):
        return self.platform_name or "إعدادات المنصّة"


class StaticPage(models.Model):
    slug = models.SlugField(max_length=80, unique=True)
    title = models.CharField(max_length=200)
    body = models.TextField(blank=True)
    is_published = models.BooleanField(default=False)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["slug"]

    def __str__(self):
        return self.title


class ActivityLog(models.Model):
    """سجل نشاط للإجراءات الحسّاسة — إضافة فقط."""

    actor = models.ForeignKey(
        "auth.User",
        null=True,
        on_delete=models.SET_NULL,
        related_name="activity_logs",
    )
    action = models.CharField(max_length=40, db_index=True)
    target_type = models.CharField(max_length=80, blank=True, db_index=True)
    target_id = models.CharField(max_length=64, blank=True)
    summary = models.CharField(max_length=240)
    ip = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["actor", "created_at"], name="core_activi_actor_i_idx"),
            models.Index(fields=["action", "created_at"], name="core_activi_action_idx"),
        ]

    def __str__(self):
        return f"{self.action} @ {self.created_at}"
