from django.db import models
from django.contrib.auth.models import User


class Notification(models.Model):
    """
    إشعارات المستخدم — كيان عابر جديد مصدره ورقة Notifications في المشروع الثاني (GAS).
    يحافظ على سلوك GAS: الأحدث أولاً، وحالة unread/read.
    """
    STATUS_CHOICES = [
        ("unread", "unread"),
        ("read", "read"),
    ]

    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="notifications"
    )
    message = models.TextField()
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default="unread")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']  # الأحدث أولاً (سلوك GAS .reverse())
        indexes = [models.Index(fields=['user', 'status'])]

    def __str__(self):
        return f"{self.user.email} - {self.status}"
