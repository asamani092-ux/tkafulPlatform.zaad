from django.db import models
from django.contrib.auth.models import User


class Notification(models.Model):
    """
    إشعارات المستخدم — داخل المنصّة فقط.
    الحالة unread/read تبقى المصدر الوحيد لـ is_read.
    """
    STATUS_CHOICES = [
        ("unread", "unread"),
        ("read", "read"),
    ]
    TYPE_CHOICES = [
        ("info", "info"),
        ("success", "success"),
        ("warning", "warning"),
        ("action", "action"),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="notifications")
    message = models.TextField()
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default="unread")
    notification_type = models.CharField(max_length=10, choices=TYPE_CHOICES, default="info")
    link = models.CharField(max_length=300, blank=True)
    event_type = models.CharField(max_length=40, blank=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["user", "status"])]

    def __str__(self):
        return f"{self.user.email} - {self.status}"


class NotificationPreference(models.Model):
    """تفضيل كتم فئة إشعار — غياب الصف يعني مفعّل."""

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="notification_preferences")
    event_type = models.CharField(max_length=40)
    enabled = models.BooleanField(default=True)

    class Meta:
        unique_together = ("user", "event_type")
        indexes = [models.Index(fields=["user", "event_type"])]
