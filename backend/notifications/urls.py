from django.urls import path
from . import views

urlpatterns = [
    path("", views.my_notifications, name="my-notifications"),
    path("unread-count/", views.unread_count, name="notifications-unread-count"),
    path("send/", views.send_notification, name="send-notification"),
    path("broadcast/", views.broadcast, name="notifications-broadcast"),
    path("mark-all-read/", views.mark_all_read, name="notifications-mark-all-read"),
    path("preferences/", views.preferences, name="notification-preferences"),
    path("<int:notification_id>/read/", views.mark_read, name="mark-notification-read"),
]
