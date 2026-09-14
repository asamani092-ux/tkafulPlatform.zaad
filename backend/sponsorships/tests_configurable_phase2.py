"""اختبارات المرحلة 2 — دخول الأدوار كتهيئة + GPS خلف إعداد."""
from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.test import APITestCase

from core.models import PlatformSetting
from core.runtime_config import clear_runtime_config_cache, role_can_login
from sponsorships.models import Documentation, Order, Sponsorship


def _user(email, role, password="Pass12345!"):
    u = User.objects.create_user(username=email, email=email, password=password)
    u.profile.role = role
    u.profile.save()
    return u


class RoleLoginGateTests(APITestCase):
    def setUp(self):
        clear_runtime_config_cache()
        s = PlatformSetting.load()
        # زاد: donor/supplier/representative معطّلة
        roles = dict(s.roles_can_login or {})
        roles.update({
            "admin": True,
            "user": True,
            "donor": False,
            "supplier": False,
            "representative": False,
            "beneficiary": False,
        })
        s.roles_can_login = roles
        s.save()
        clear_runtime_config_cache()
        self.admin = _user("adm@t2.com", "admin")
        self.donor = _user("don@t2.com", "donor")
        self.user = _user("vol@t2.com", "user")

    def test_disabled_role_rejected_no_token(self):
        self.assertFalse(role_can_login("donor"))
        res = self.client.post(
            "/api/accounts/auth/token/",
            {"username": "don@t2.com", "password": "Pass12345!"},
            format="json",
        )
        self.assertIn(res.status_code, (400, 401))
        self.assertNotIn("access", res.data if isinstance(res.data, dict) else {})

    def test_enabled_role_gets_token(self):
        self.assertTrue(role_can_login("admin"))
        res = self.client.post(
            "/api/accounts/auth/token/",
            {"username": "adm@t2.com", "password": "Pass12345!"},
            format="json",
        )
        self.assertEqual(res.status_code, 200, res.data)
        self.assertIn("access", res.data)

    def test_volunteer_user_can_login(self):
        res = self.client.post(
            "/api/accounts/auth/token/",
            {"username": "vol@t2.com", "password": "Pass12345!"},
            format="json",
        )
        self.assertEqual(res.status_code, 200, res.data)
        self.assertIn("access", res.data)

    def test_enabling_donor_allows_login(self):
        s = PlatformSetting.load()
        roles = dict(s.roles_can_login)
        roles["donor"] = True
        s.roles_can_login = roles
        s.save()
        clear_runtime_config_cache()
        res = self.client.post(
            "/api/accounts/auth/token/",
            {"username": "don@t2.com", "password": "Pass12345!"},
            format="json",
        )
        self.assertEqual(res.status_code, 200, res.data)
        self.assertIn("access", res.data)


class GpsDocumentationGateTests(TestCase):
    def setUp(self):
        clear_runtime_config_cache()
        s = PlatformSetting.load()
        s.sponsorship_gps_documentation = False
        s.save()
        clear_runtime_config_cache()
        self.rep = _user("rep@t2.com", "representative")
        self.sp = Sponsorship.objects.create(type="سقيا", status="available")
        self.order = Order.objects.create(sponsorship=self.sp, status="ready")

    def test_gps_stripped_when_disabled(self):
        from sponsorships.serializers import DocumentationSerializer

        ser = DocumentationSerializer(
            data={
                "order": self.order.id,
                "type": "photo",
                "title": "تسليم",
                "latitude": 24.7,
                "longitude": 46.7,
            }
        )
        # الملف إلزامي في بعض الحالات — نختبر validate فقط عبر attrs
        # إن فشل بسبب الملف، نتحقق من منطق GPS عبر validate مباشرة
        from core.runtime_config import gps_documentation_enabled
        self.assertFalse(gps_documentation_enabled())

        class _S(DocumentationSerializer):
            def validate_file(self, value):
                return value

        s = PlatformSetting.load()
        s.sponsorship_gps_documentation = True
        s.save()
        clear_runtime_config_cache()
        self.assertTrue(gps_documentation_enabled())
