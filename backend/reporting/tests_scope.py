"""اختبارات المرحلة 4: بوّابة التقارير المُنطّقة + مقاييس إنجاز المتطوّع."""
from django.contrib.auth.models import User
from rest_framework.test import APITestCase

from projects.models import Project
from volunteering.models import Task


def make_user(username, role="user", approved=True):
    u = User.objects.create_user(username=username, email=f"{username}@t.local", password="pass12345")
    u.profile.role = role
    u.profile.is_approved = approved
    u.profile.save()
    return u


class ReportScopeTests(APITestCase):
    def setUp(self):
        self.admin = make_user("boss", role="admin")
        self.vol = make_user("vol1", role="user")
        self.vol.profile.total_volunteer_hours = 12
        self.vol.profile.name = "متطوّع"
        self.vol.profile.save()
        self.project = Project.objects.create(name="مشروع تقرير", slug="rep-proj")
        Task.objects.create(title="مهمة 1", project=self.project, volunteer=self.vol, status="مكتملة")
        Task.objects.create(title="مهمة 2", project=self.project, volunteer=self.vol, status="قيد التنفيذ")

    def test_platform_scope(self):
        self.client.force_authenticate(self.admin)
        res = self.client.get("/api/reports/scope/?type=platform")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["scope"], "platform")
        self.assertIn("summary", res.data)
        self.assertGreaterEqual(res.data["summary"]["total_projects"], 1)

    def test_project_scope(self):
        self.client.force_authenticate(self.admin)
        res = self.client.get(f"/api/reports/scope/?type=project&project={self.project.slug}")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["rows"][0]["tasks_total"], 2)
        self.assertEqual(res.data["rows"][0]["tasks_completed"], 1)

    def test_volunteers_scope_metrics(self):
        self.client.force_authenticate(self.admin)
        res = self.client.get("/api/reports/scope/?type=volunteers")
        self.assertEqual(res.status_code, 200)
        row = next(r for r in res.data["rows"] if r["id"] == self.vol.id)
        self.assertEqual(row["volunteer_hours"], 12)
        self.assertEqual(row["projects_participated"], 1)
        self.assertEqual(row["completed_tasks"], 1)

    def test_scope_requires_admin(self):
        self.client.force_authenticate(self.vol)
        res = self.client.get("/api/reports/scope/?type=platform")
        self.assertEqual(res.status_code, 403)


class VolunteerTasksMetricsTests(APITestCase):
    def setUp(self):
        self.admin = make_user("boss2", role="admin")
        self.vol = make_user("vol2", role="user")
        self.vol.profile.total_volunteer_hours = 8
        self.vol.profile.save()
        p1 = Project.objects.create(name="أ", slug="p-a")
        p2 = Project.objects.create(name="ب", slug="p-b")
        Task.objects.create(title="ت1", project=p1, volunteer=self.vol, status="مكتملة")
        Task.objects.create(title="ت2", project=p2, volunteer=self.vol, status="قيد التنفيذ")

    def test_metrics_included(self):
        self.client.force_authenticate(self.admin)
        res = self.client.get(f"/api/reports/volunteer-tasks/?volunteer_id={self.vol.id}")
        self.assertEqual(res.status_code, 200)
        m = res.data["metrics"]
        self.assertEqual(m["volunteer_hours"], 8)
        self.assertEqual(m["projects_participated"], 2)
        self.assertEqual(m["completed_tasks"], 1)
        self.assertEqual(m["total_tasks"], 2)
