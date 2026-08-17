"""Smoke tests for reporting API endpoints (Phase 1 ownership move)."""
from django.contrib.auth.models import User
from rest_framework.test import APITestCase

from reporting.models import VolunteerStatistics
from volunteering import project_helpers


def make_user(username, role="user"):
    user = User.objects.create_user(
        username=username, email=f"{username}@t.local", password="pass12345"
    )
    user.profile.role = role
    user.profile.save()
    return user


class ReportingEndpointTests(APITestCase):
    def setUp(self):
        self.admin = make_user("rptadmin", role="admin")

    def test_list_reports_requires_auth(self):
        res = self.client.get("/api/reports/")
        self.assertEqual(res.status_code, 401)

        self.client.force_authenticate(self.admin)
        res = self.client.get("/api/reports/")
        self.assertEqual(res.status_code, 200)

    def test_public_volunteer_statistics(self):
        # Empty DB → 404; with data → 200
        res = self.client.get("/api/public-volunteer-statistics/")
        self.assertIn(res.status_code, (200, 404))

        VolunteerStatistics.objects.create(
            year=2025,
            total_volunteers=10,
            new_volunteers=8,
            returning_volunteers=2,
            total_hours=100,
            total_contribution_value=1300,
            contribution_value_display="1K",
        )
        res = self.client.get("/api/public-volunteer-statistics/")
        self.assertEqual(res.status_code, 200)

    def test_projects_list_still_works_via_volunteering_profile_viewset(self):
        """GET /api/projects/ remains on VolunteeringProfileViewSet (path unchanged)."""
        res = self.client.get("/api/projects/")
        self.assertEqual(res.status_code, 401)

        self.client.force_authenticate(self.admin)
        project_helpers.create_volunteering_project(
            title="مشروع اختبار",
            desc="وصف",
            status="ACTIVE",
        )
        res = self.client.get("/api/projects/")
        self.assertEqual(res.status_code, 200)
