from rest_framework import serializers
from .models import Notification, NotificationPreference
from .services import EVENT_TYPES


class NotificationSerializer(serializers.ModelSerializer):
    is_read = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = ["id", "message", "status", "is_read", "notification_type", "link", "event_type", "created_at"]
        read_only_fields = fields

    def get_is_read(self, obj):
        return obj.status == "read"


class NotificationPreferenceSerializer(serializers.Serializer):
    event_type = serializers.ChoiceField(choices=EVENT_TYPES)
    enabled = serializers.BooleanField()
