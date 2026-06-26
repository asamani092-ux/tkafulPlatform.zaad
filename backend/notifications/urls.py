from django.urls import path
from . import views

urlpatterns = [
    path("", views.my_notifications, name="my-notifications"),
    path("send/", views.send_notification, name="send-notification"),
    path("<int:notification_id>/read/", views.mark_read, name="mark-notification-read"),
]
