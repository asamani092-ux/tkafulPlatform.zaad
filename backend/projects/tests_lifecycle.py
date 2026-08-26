"""اختبارات انتقالات دورة حياة المشروع + قاعدة الظهور العام (النشطة فقط)."""
from django.contrib.auth.models import User
from django.core.cache import cache
from rest_framework.test import APITestCase

from core.models import ActivityLog
from .lifecycle import ALLOWED_TRANSITIONS, can_transition, next_actions
from .models import Project, ProjectMember


def make_user(username, role="user"):
    u = User.objects.create_user(username=username, email=f"{username}@t.local", password="pass12345")
    u.profile.role = role
    u.profile.save()
    return u


class LifecycleMapTests(APITestCase):
    def test_allowed_transitions_shape(self):
        self.assertEqual(next_actions("draft"), ["activate", "archive"])
        self.assertEqual(sorted(next_actions("active")), ["archive", "complete"])
        self.assertEqual(sorted(next_actions("completed")), ["activate", "archive", "reopen"])
        self.assertEqual(next_actions("archived"), ["reopen"])
        self.assertFalse(can_transition("archived", "archive"))
        self.assertIn("active", ALLOWED_TRANSITIONS["draft"])


class LifecycleActionTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.admin = make_user("boss", role="admin")
        self.member = make_user("pm")
        self.project = Project.objects.create(name="مشروع", slug="lc-p", status="draft")
        ProjectMember.objects.create(project=self.project, user=self.member, role="project_admin")

    def _post(self, action, user=None):
        self.client.force_authenticate(user or self.admin)
        return self.client.post(f"/api/platform/projects/{self.project.id}/{action}/", {}, format="json")

    def test_legal_transition_activate_then_complete(self):
        res = self._post("activate")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["status"], "active")
        self.assertIn("complete", res.data["next_actions"])
        res = self._post("complete")
        self.assertEqual(res.status_code, 200)
        self.project.refresh_from_db()
        self.assertEqual(self.project.status, "completed")

    def test_illegal_transition_400(self):
        # draft cannot be completed directly
        res = self._post("complete")
        self.assertEqual(res.status_code, 400)
        self.assertIn("لا يمكن", res.data["detail"])
        self.project.refresh_from_db()
        self.assertEqual(self.project.status, "draft")

    def test_archive_from_any_and_reopen(self):
        self.assertEqual(self._post("archive").status_code, 200)
        self.project.refresh_from_db()
        self.assertEqual(self.project.status, "archived")
        self.assertEqual(self._post("reopen").status_code, 200)
        self.project.refresh_from_db()
        self.assertEqual(self.project.status, "active")

    def test_non_admin_403(self):
        res = self._post("activate", user=self.member)
        self.assertEqual(res.status_code, 403)
        self.project.refresh_from_db()
        self.assertEqual(self.project.status, "draft")

    def test_transition_logs_activity(self):
        self._post("activate")
        log = ActivityLog.objects.filter(action="project_status_change", target_id=str(self.project.id)).first()
        self.assertIsNotNone(log)
        self.assertIn("draft", log.summary)
        self.assertIn("active", log.summary)
        self.assertEqual(log.actor_id, self.admin.id)


class PublicVisibilityTests(APITestCase):
    def setUp(self):
        cache.clear()
        Project.objects.create(name="نشط", slug="active-p", status="active", is_active=True)
        Project.objects.create(name="مكتمل", slug="completed-p", status="completed", is_active=True)
        Project.objects.create(name="مسودة", slug="draft-p", status="draft", is_active=True)
        Project.objects.create(name="مؤرشف", slug="archived-p", status="archived", is_active=True)

    def test_public_list_shows_active_only(self):
        res = self.client.get("/api/platform/public/projects/")
        self.assertEqual(res.status_code, 200)
        slugs = {p["slug"] for p in res.json()}
        self.assertIn("active-p", slugs)
        self.assertNotIn("completed-p", slugs)
        self.assertNotIn("draft-p", slugs)
        self.assertNotIn("archived-p", slugs)
        # كل مشروع في الحمولة العامة حالته active
        self.assertTrue(all(p["status"] == "active" for p in res.json()))

    def test_public_detail_404_for_completed(self):
        self.assertEqual(self.client.get("/api/platform/public/projects/completed-p/").status_code, 404)
        self.assertEqual(self.client.get("/api/platform/public/projects/archived-p/").status_code, 404)
        self.assertEqual(self.client.get("/api/platform/public/projects/active-p/").status_code, 200)
