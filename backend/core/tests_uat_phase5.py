"""
UAT Phase 5 — نطاق مدير المشروع + خصوصية النقاط العامة بعد الإصلاحات.
"""
from django.contrib.auth.models import User
from django.core.cache import cache
from rest_framework.test import APITestCase

from projects.models import Project, ProjectMember, ProjectTool
from services.legacy_forms import ensure_system_forms, SLUG_WATER
from services.models import RequestForm, RequestSubmission
from volunteering.models import VolunteeringProfile


def make_user(email, role="user"):
    u = User.objects.create_user(username=email, email=email, password="Hello12345!")
    u.profile.role = role
    u.profile.save()
    return u


class ProjectManagerScopingTests(APITestCase):
    """مدير مشروع يرى مشاريعه فقط؛ نقاط المشرف العام تُرجع 403."""

    def setUp(self):
        self.pm = make_user("uat_pm@scope.test")
        self.admin = make_user("admin@scope.test", "admin")
        self.mine = Project.objects.create(name="مشروعي", slug="pm-mine", status="active", is_active=True)
        self.other = Project.objects.create(name="آخر", slug="pm-other", status="active", is_active=True)
        ProjectMember.objects.create(project=self.mine, user=self.pm, role="project_admin")
        ProjectTool.objects.get_or_create(project=self.mine, tool_key="map", defaults={"is_enabled": True})

    def test_pm_lists_only_own_projects(self):
        self.client.force_authenticate(self.pm)
        res = self.client.get("/api/platform/projects/")
        self.assertEqual(res.status_code, 200)
        slugs = [p["slug"] for p in (res.data if isinstance(res.data, list) else res.data.get("results", []))]
        self.assertIn("pm-mine", slugs)
        self.assertNotIn("pm-other", slugs)

    def test_pm_forbidden_on_super_admin_apis(self):
        self.client.force_authenticate(self.pm)
        for path in (
            "/api/accounts/users/",
            "/api/volunteers/",
            "/api/admin/request-forms/",
            "/api/admin/request-submissions/",
            "/api/activity-logs/",
            "/api/reports/",
        ):
            res = self.client.get(path)
            self.assertIn(res.status_code, (401, 403), path)


class PrivacyResweepTests(APITestCase):
    def setUp(self):
        cache.clear()
        ensure_system_forms()
        self.draft = Project.objects.create(name="مسودة-خصوصية", slug="priv-draft", status="draft", is_active=True)
        VolunteeringProfile.objects.create(project=self.draft, volunteer_status="PLANNED", is_hidden=False)
        form = RequestForm.objects.get(slug=SLUG_WATER)
        RequestSubmission.objects.create(
            form=form,
            data={"applicant_name": "اسم سرّي", "mobile_number": "0599999999"},
        )

    def test_public_projects_hide_draft(self):
        for path in ("/api/public-projects/", "/api/platform/public/projects/"):
            res = self.client.get(path)
            self.assertEqual(res.status_code, 200, path)
            blob = str(res.json())
            self.assertNotIn("مسودة-خصوصية", blob)
            self.assertNotIn("priv-draft", blob)

    def test_public_forms_hide_submission_pii(self):
        res = self.client.get("/api/public-forms/")
        self.assertEqual(res.status_code, 200)
        blob = str(res.json())
        self.assertNotIn("اسم سرّي", blob)
        self.assertNotIn("0599999999", blob)
