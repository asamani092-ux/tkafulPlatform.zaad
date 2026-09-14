"""
فئات تحديد معدّل الطلبات (throttling) ذات نطاقات ثابتة، لاستخدامها على
النقاط الحسّاسة (تسجيل/دخول) والنماذج العامة (اقتراح/طلب خدمة/سقيا).
"""
from rest_framework.settings import api_settings
from rest_framework.throttling import SimpleRateThrottle


class AuthRateThrottle(SimpleRateThrottle):
    """تسجيل/دخول/refresh — scope='auth'."""
    scope = "auth"

    def get_rate(self):
        return api_settings.DEFAULT_THROTTLE_RATES.get(self.scope)

    def get_cache_key(self, request, view):
        return self.cache_format % {
            "scope": self.scope,
            "ident": self.get_ident(request),
        }


class PublicWriteRateThrottle(SimpleRateThrottle):
    """النماذج العامة (POST) — scope='public_write'."""
    scope = "public_write"

    def get_rate(self):
        return api_settings.DEFAULT_THROTTLE_RATES.get(self.scope)

    def get_cache_key(self, request, view):
        return self.cache_format % {
            "scope": self.scope,
            "ident": self.get_ident(request),
        }


class BroadcastRateThrottle(SimpleRateThrottle):
    """بث المشرف — scope='broadcast'."""
    scope = "broadcast"

    def get_rate(self):
        return api_settings.DEFAULT_THROTTLE_RATES.get(self.scope)

    def get_cache_key(self, request, view):
        ident = request.user.pk if request.user and request.user.is_authenticated else self.get_ident(request)
        return self.cache_format % {"scope": self.scope, "ident": ident}
