from django.urls import path
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from .views import register, me, update_profile, change_password, logout
from .serializers import EmailTokenObtainPairSerializer
from core.throttles import AuthRateThrottle


class EmailTokenObtainPairView(TokenObtainPairView):
    """Custom token view that accepts email instead of username"""
    serializer_class = EmailTokenObtainPairSerializer
    throttle_classes = [AuthRateThrottle]  # تحديد معدّل محاولات الدخول


urlpatterns = [
    # Authentication endpoints
    path("auth/register/", register, name="register"),
    path("auth/token/", EmailTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("auth/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    
    # User profile endpoints
    path("me/", me, name="me"),
    path("profile/", update_profile, name="update_profile"),
    path("change-password/", change_password, name="change_password"),
    path("logout/", logout, name="logout"),
]