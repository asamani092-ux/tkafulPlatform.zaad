"""Tests for volunteering.Project → projects.Project + VolunteeringProfile merge (A3)."""
from django.contrib.auth.models import User
from rest_framework.test import APITestCase

from projects.models import Project, ProjectTool
from volunteering.models import VolunteeringProfile, Task, ProjectAssignment


class VolunteeringProfileMigrationTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username="a3@test.com", email="a3@test.com", password="Hello12345!"
        )
        self.admin.profile.role = "admin"
        self.admin.profile.save()

    def test_public_projects_returns_profile_backed_data(self):
        platform = Project.objects.create(name="مشروع اختبار", slug="test-vol", status="active")
        VolunteeringProfile.objects.create(
            project=platform, volunteer_status="ACTIVE", beneficiaries=10, is_hidden=False,
        )
        res = self.client.get("/api/public-projects/")
        self.assertEqual(res.status_code, 200)
        titles = [p["title"] for p in res.json()]
        self.assertIn("مشروع اختبار", titles)

    def test_admin_projects_list_uses_platform_id(self):
        platform = Project.objects.create(name="إدارة", slug="admin-vol", status="active")
        VolunteeringProfile.objects.create(project=platform, volunteer_status="ACTIVE")
        self.client.force_authenticate(self.admin)
        res = self.client.get("/api/projects/")
        self.assertEqual(res.status_code, 200)
        ids = [p["id"] for p in res.json()]
        self.assertIn(platform.id, ids)

    def test_task_fk_points_to_platform_project(self):
        platform = Project.objects.create(name="مهام", slug="tasks-vol", status="active")
        VolunteeringProfile.objects.create(project=platform, volunteer_status="ACTIVE")
        task = Task.objects.create(title="مهمة", project=platform)
        self.assertEqual(task.project_id, platform.id)
        self.assertEqual(task.project.name, "مهام")

    def test_volunteering_tool_enabled_on_seed_match(self):
        """Known slug tafaqqadhum from seed should accept volunteering profile."""
        platform = Project.objects.get(slug="tafaqqadhum")
        self.assertTrue(
            ProjectTool.objects.filter(project=platform, tool_key="volunteering", is_enabled=True).exists()
        )
