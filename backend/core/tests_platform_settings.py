from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.test import APIClient

from core.platform_settings import patch_settings


class PlatformSettingsApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(username="admin@takaful.com", email="admin@takaful.com", password="admin123")
        self.admin.profile.role = "admin"
        self.admin.profile.name = "Admin"
        self.admin.profile.is_approved = True
        self.admin.profile.save()
        self.vol = User.objects.create_user(username="vol@x.com", email="vol@x.com", password="pass12345")
        self.vol.profile.is_approved = True
        self.vol.profile.save()

    def test_public_settings_defaults(self):
        res = self.client.get("/api/platform/public-settings/")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data["water_supply_form_enabled"])
        self.assertTrue(data["public_registration_enabled"])
        self.assertFalse(data["maintenance_mode"])

    def test_admin_patch_water_supply(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.patch(
            "/api/platform/settings/",
            {"water_supply_form_enabled": False},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        self.assertFalse(res.json()["water_supply_form_enabled"])
        pub = self.client.get("/api/platform/public-settings/").json()
        self.assertFalse(pub["water_supply_form_enabled"])

    def test_vol_cannot_patch(self):
        self.client.force_authenticate(user=self.vol)
        res = self.client.patch("/api/platform/settings/", {"maintenance_mode": True}, format="json")
        self.assertEqual(res.status_code, 403)

    def test_patch_accumulates_history(self):
        patch_settings({"contact_email": "a@x.com"}, self.admin)
        patch_settings({"contact_email": "b@x.com"}, self.admin)
        from core.models import PlatformSettingHistory

        self.assertEqual(PlatformSettingHistory.objects.filter(key="contact_email").count(), 2)
