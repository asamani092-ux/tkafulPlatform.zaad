from django.urls import path
from .views import ping, uat_status

urlpatterns = [
    path("ping/", ping, name="ping"),
    path("uat/", uat_status, name="uat-status"),
]
