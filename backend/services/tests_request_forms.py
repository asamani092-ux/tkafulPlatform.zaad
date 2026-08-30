"""نماذج الطلبات الديناميكية (D-47): إنشاء إداري، تقديم عام، سرد للإدارة."""
from django.contrib.auth.models import User
from rest_framework.test import APITestCase

from projects.models import Project
from .models import RequestForm, RequestSubmission


def make_admin(email="adm@x.com"):
    u = User.objects.create_user(username=email, email=email, password="Hello12345!")
    u.profile.role = "admin"
    u.profile.name = "admin"
    u.profile.save()
    return u


class RequestFormFlowTests(APITestCase):
    def setUp(self):
        self.admin = make_admin()
        self.project, _ = Project.objects.get_or_create(slug="dyn-forms-test", defaults={"name": "اختبار النماذج"})
        self.schema = [
            {"key": "full_name", "label": "الاسم", "type": "text", "required": True},
            {"key": "count", "label": "العدد", "type": "number", "required": False},
            {"key": "kind", "label": "النوع", "type": "select", "required": True, "options": ["أ", "ب"]},
        ]

    def _create_form(self):
        self.client.force_authenticate(self.admin)
        res = self.client.post("/api/admin/request-forms/", {
            "project": self.project.id,
            "title": "طلب سقيا",
            "slug": "water-need",
            "fields_schema": self.schema,
            "is_active": True,
        }, format="json")
        self.assertEqual(res.status_code, 201, res.data)
        return res.data["id"]

    def test_admin_creates_form_linked_to_project(self):
        form_id = self._create_form()
        form = RequestForm.objects.get(id=form_id)
        self.assertEqual(form.project_id, self.project.id)
        self.assertEqual(form.created_by, self.admin)

    def test_rejects_duplicate_field_key(self):
        self.client.force_authenticate(self.admin)
        res = self.client.post("/api/admin/request-forms/", {
            "title": "x", "slug": "x", "is_active": True,
            "fields_schema": [
                {"key": "a", "label": "A", "type": "text"},
                {"key": "a", "label": "A2", "type": "text"},
            ],
        }, format="json")
        self.assertEqual(res.status_code, 400)

    def test_public_lists_only_active_forms_for_project(self):
        self._create_form()
        RequestForm.objects.create(title="معطّل", slug="off", is_active=False, project=self.project, fields_schema=[])
        self.client.force_authenticate(None)
        res = self.client.get(f"/api/public-forms/?project={self.project.slug}")
        self.assertEqual(res.status_code, 200)
        slugs = [f["slug"] for f in res.data]
        self.assertIn("water-need", slugs)
        self.assertNotIn("off", slugs)

    def test_public_submit_validates_required_and_select(self):
        self._create_form()
        self.client.force_authenticate(None)
        # مطلوب مفقود
        bad = self.client.post("/api/public-forms/water-need/submit/", {"data": {"count": 3}}, format="json")
        self.assertEqual(bad.status_code, 400)
        # قيمة select غير صالحة
        bad2 = self.client.post("/api/public-forms/water-need/submit/", {
            "data": {"full_name": "س", "kind": "ج"},
        }, format="json")
        self.assertEqual(bad2.status_code, 400)
        # صحيح
        ok = self.client.post("/api/public-forms/water-need/submit/", {
            "data": {"full_name": "سالم", "count": "5", "kind": "أ"},
        }, format="json")
        self.assertEqual(ok.status_code, 201, ok.data)
        sub = RequestSubmission.objects.get(id=ok.data["id"])
        self.assertEqual(sub.data["full_name"], "سالم")
        self.assertEqual(sub.data["count"], 5.0)

    def test_admin_lists_and_updates_submission_status(self):
        form_id = self._create_form()
        self.client.force_authenticate(None)
        self.client.post("/api/public-forms/water-need/submit/", {
            "data": {"full_name": "سالم", "kind": "أ"},
        }, format="json")
        self.client.force_authenticate(self.admin)
        lst = self.client.get(f"/api/admin/request-submissions/?form={form_id}")
        self.assertEqual(lst.status_code, 200)
        rows = lst.data["results"] if isinstance(lst.data, dict) and "results" in lst.data else lst.data
        self.assertEqual(len(rows), 1)
        sid = rows[0]["id"]
        upd = self.client.patch(f"/api/admin/request-submissions/{sid}/", {
            "status": "APPROVED", "admin_notes": "تم",
        }, format="json")
        self.assertEqual(upd.status_code, 200, upd.data)
        self.assertEqual(RequestSubmission.objects.get(id=sid).status, "APPROVED")
