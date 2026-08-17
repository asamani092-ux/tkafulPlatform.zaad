"""UAT status endpoint: absent (404) by default; enabled only when UAT_ENABLED=True."""
from django.test import override_settings
from rest_framework.test import APITestCase


class UatStatusGuardTests(APITestCase):
    def test_default_settings_returns_404(self):
        res = self.client.get("/api/uat/")
        self.assertEqual(res.status_code, 404)

    @override_settings(UAT_ENABLED=True)
    def test_enabled_returns_200(self):
        res = self.client.get("/api/uat/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json(), {"enabled": True})

    @override_settings(UAT_ENABLED=False)
    def test_explicitly_disabled_returns_404(self):
        res = self.client.get("/api/uat/")
        self.assertEqual(res.status_code, 404)
