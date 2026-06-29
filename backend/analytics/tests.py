from django.contrib.auth.models import User
from rest_framework.test import APITestCase

from analytics.models import DashboardSection


class ExecutiveDashboardTests(APITestCase):
    def setUp(self):
        DashboardSection.objects.create(title="قسم اختبار", unit="نشاطًا", total=10)

    def test_executive_dashboard_is_public(self):
        res = self.client.get("/api/dashboard/executive/")
        self.assertEqual(res.status_code, 200)
        self.assertIn("sections", res.data)
        self.assertGreaterEqual(len(res.data["sections"]), 1)

    def test_dashboard_read_is_public(self):
        res = self.client.get("/api/dashboard/sections/")
        self.assertEqual(res.status_code, 200)

    def test_dashboard_write_requires_staff(self):
        # بلا توكن: ممنوع
        res = self.client.post("/api/dashboard/sections/", {"title": "x"}, format="json")
        self.assertIn(res.status_code, (401, 403))

    def test_volunteer_cannot_write_dashboard(self):
        user = User.objects.create_user(username="v@example.com", email="v@example.com", password="Hello12345!")
        user.profile.role = "user"
        user.profile.save()
        self.client.force_authenticate(user=user)
        res = self.client.post("/api/dashboard/sections/", {"title": "x"}, format="json")
        self.assertEqual(res.status_code, 403)

    def test_admin_can_write_dashboard(self):
        admin = User.objects.create_user(username="a@example.com", email="a@example.com", password="Hello12345!")
        admin.profile.role = "admin"
        admin.profile.save()
        self.client.force_authenticate(user=admin)
        res = self.client.post(
            "/api/dashboard/sections/",
            {"title": "قسم جديد", "unit": "نشاطًا", "total": 5}, format="json",
        )
        self.assertEqual(res.status_code, 201)
