"""Legacy URL resolution tests after removing saqya/takaful_app URL shims (D-24)."""
from django.contrib.auth.models import User
from rest_framework.test import APITestCase


class LegacyUrlResolutionTests(APITestCase):
    """Verify legacy /api/saqya/ and /api/ volunteering paths still resolve."""

    def setUp(self):
        self.admin = User.objects.create_user(
            username="admin@legacy.test", email="admin@legacy.test", password="Hello12345!"
        )
        self.admin.profile.role = "admin"
        self.admin.profile.save()

    def test_saqya_dashboard_legacy_path(self):
        self.client.force_authenticate(self.admin)
        res = self.client.get("/api/saqya/dashboard/")
        self.assertEqual(res.status_code, 200)

    def test_sponsorships_namespace_path(self):
        self.client.force_authenticate(self.admin)
        res = self.client.get("/api/sponsorships/sponsorships/")
        self.assertIn(res.status_code, (200, 403))

    def test_volunteering_stats_legacy_path(self):
        self.client.force_authenticate(self.admin)
        res = self.client.get("/api/stats/")
        self.assertEqual(res.status_code, 200)

    def test_public_projects_legacy_path(self):
        res = self.client.get("/api/public-projects/")
        self.assertEqual(res.status_code, 200)

    def test_public_home_stats_legacy_path(self):
        res = self.client.get("/api/public-home-stats/")
        self.assertEqual(res.status_code, 200)
