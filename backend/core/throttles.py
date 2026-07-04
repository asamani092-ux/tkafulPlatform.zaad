"""
فئات تحديد معدّل الطلبات (throttling) ذات نطاقات ثابتة، لاستخدامها على
النقاط الحسّاسة (تسجيل/دخول) والنماذج العامة (اقتراح/طلب خدمة/سقيا).
"""
from rest_framework.throttling import AnonRateThrottle


class AuthRateThrottle(AnonRateThrottle):
    """تسجيل/دخول — يستخدم معدّل scope='auth' (انظر DEFAULT_THROTTLE_RATES)."""
    scope = "auth"


class PublicWriteRateThrottle(AnonRateThrottle):
    """النماذج العامة (POST) — يستخدم معدّل scope='public_write'."""
    scope = "public_write"
