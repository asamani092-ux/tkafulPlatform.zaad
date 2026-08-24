from django.conf import settings
from django.db import models


class PlatformSetting(models.Model):
    """القيمة الحالية لإعداد منصّة — مفتاح واحد لكل صف."""

    key = models.CharField(max_length=100, unique=True, db_index=True)
    value_json = models.JSONField()
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="platform_setting_updates",
    )

    class Meta:
        db_table = "core_platform_setting"
        ordering = ["key"]

    def __str__(self):
        return self.key


class PlatformSettingHistory(models.Model):
    """سجل تراكمي — يُضاف عند كل تغيير دون استبدال السجل السابق."""

    key = models.CharField(max_length=100, db_index=True)
    value_json = models.JSONField()
    changed_at = models.DateTimeField(auto_now_add=True)
    changed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="platform_setting_history",
    )

    class Meta:
        db_table = "core_platform_setting_history"
        ordering = ["-changed_at"]

    def __str__(self):
        return f"{self.key} @ {self.changed_at}"
