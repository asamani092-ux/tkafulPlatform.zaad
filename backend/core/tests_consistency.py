"""
كنس الاتساق النهائي (المرحلة 4): خصوصية + صلاحيات + إشعارات للنقاط الجديدة
(دورة الحياة، النوع، إعدادات الأدوات). قراءة فقط لا تغيّر السلوك.
"""
from django.contrib.auth.models import User
from django.core.cache import cache
from rest_framework.test import APITestCase

from notifications.models import Notification
from projects.models import Project, ProjectType


PII_TOKENS = ("email", "phone", "national_id", "mobile", "created_by", "password")


def make_user(username, role="user"):
    u = User.objects.create_user(username=username, email=f"{username}@t.local", password="pass12345")
    u.profile.role = role
    u.profile.save()
    return u


class PrivacySweepTests(APITestCase):
    def setUp(self):
        cache.clear()
        t = ProjectType.objects.get(slug="kafalat")
        Project.objects.create(name="عام", slug="pub-x", status="active", is_active=True, type=t)

    def test_public_projects_no_pii(self):
        blob = str(self.client.get("/api/platform/public/projects/").json()).lower()
        for tok in PII_TOKENS:
            self.assertNotIn(tok, blob, f"leaked {tok}")

    def test_public_project_detail_no_pii(self):
        blob = str(self.client.get("/api/platform/public/projects/pub-x/").json()).lower()
        for tok in PII_TOKENS:
            self.assertNotIn(tok, blob, f"leaked {tok}")

    def test_public_project_types_safe_fields_only(self):
        rows = self.client.get("/api/platform/public/project-types/").json()
        for row in rows:
            self.assertEqual(set(row.keys()), {"id", "name", "slug", "is_active", "order"})


class PermissionSweepTests(APITestCase):
    """كل كتابة جديدة IsAdmin/super-admin؛ غير المشرف يُرفض (403)."""

    def setUp(self):
        cache.clear()
        self.user = make_user("vol", role="user")
        self.project = Project.objects.create(name="ص", slug="perm-x", status="draft")
        self.client.force_authenticate(self.user)

    def test_lifecycle_actions_forbidden_for_non_admin(self):
        for action in ("activate", "complete", "archive", "reopen"):
            res = self.client.post(f"/api/platform/projects/{self.project.id}/{action}/", {}, format="json")
            self.assertEqual(res.status_code, 403, action)

    def test_set_tool_forbidden_for_non_admin(self):
        res = self.client.post(
            f"/api/platform/projects/{self.project.id}/set_tool/",
            {"tool_key": "map", "is_enabled": True},
            format="json",
        )
        self.assertEqual(res.status_code, 403)

    def test_project_type_write_forbidden_for_non_admin(self):
        self.assertEqual(
            self.client.post("/api/platform/project-types/", {"name": "x", "slug": "x"}, format="json").status_code,
            403,
        )


class LifecycleNotificationTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.admin = make_user("boss", role="admin")
        self.project = Project.objects.create(name="ن", slug="notif-x", status="draft")
        self.client.force_authenticate(self.admin)

    def test_transition_fires_admin_notification(self):
        res = self.client.post(f"/api/platform/projects/{self.project.id}/activate/", {}, format="json")
        self.assertEqual(res.status_code, 200)
        note = Notification.objects.filter(user=self.admin, event_type="project_status").first()
        self.assertIsNotNone(note)
        self.assertIn("ن", note.message)
        self.assertIn("active", note.message)
