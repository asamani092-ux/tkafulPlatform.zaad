"""
اختبارات ملف المشروع: أقسام، بوابات، توكن اعتماد، صلاحيات، أنشطة.
"""
from datetime import timedelta
from unittest.mock import patch

from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework.test import APITestCase

from projectdocs.models import ApprovalRequest, ProjectDossier, StageActivity
from projectdocs.sections import DOCUMENT_SECTIONS, CLOSURE_SECTIONS, schema_payload, validate_section_data
from projectdocs.services import compute_auto_status, create_dossier_for_project
from projects.models import Project


def make_user(username, role="user"):
    user = User.objects.create_user(username=username, email=f"{username}@t.local", password="pass12345")
    user.profile.role = role
    user.profile.save()
    return user


class SectionsCatalogTests(APITestCase):
    def test_catalog_counts(self):
        self.assertEqual(len(DOCUMENT_SECTIONS), 15)
        self.assertEqual(len(CLOSURE_SECTIONS), 11)
        payload = schema_payload()
        self.assertEqual(len(payload["stages"]), 5)
        self.assertEqual(len(payload["document"]), 15)
        self.assertEqual(len(payload["closure"]), 11)

    def test_validate_rejects_unknown_keys(self):
        with self.assertRaises(Exception):
            validate_section_data("document", "basics", {"nope": "x"})

    def test_validate_table(self):
        cleaned = validate_section_data(
            "document",
            "mgmt_kpis",
            {"indicators": [{"name": "أ", "baseline": "0", "target": "10", "unit": "%"}]},
        )
        self.assertEqual(cleaned["indicators"][0]["name"], "أ")


class DossierApiTests(APITestCase):
    def setUp(self):
        self.admin = make_user("admin1", role="admin")
        self.manager = make_user("mgr1", role="user")
        self.other = make_user("other1", role="user")
        self.project = Project.objects.create(name="ملف تجريبي", slug="dossier-demo", status="active")

    def test_only_admin_creates(self):
        self.client.force_authenticate(self.manager)
        res = self.client.post(
            "/api/projectdocs/dossiers/",
            {"project_id": self.project.id, "sponsor_email": "s@test.com"},
            format="json",
        )
        self.assertEqual(res.status_code, 403)

        self.client.force_authenticate(self.admin)
        res = self.client.post(
            "/api/projectdocs/dossiers/",
            {
                "project_id": self.project.id,
                "sponsor_email": "sponsor@test.com",
                "sponsor_name": "الراعي",
                "manager_id": self.manager.id,
                "manager_email": "mgr1@t.local",
            },
            format="json",
        )
        self.assertEqual(res.status_code, 201, res.content)
        self.assertTrue(res.data["code"].startswith("PRJ-"))
        self.assertEqual(len(res.data["sections"]), 26)
        self.assertEqual(len(res.data["stages"]), 5)
        self.assertEqual(res.data["stages"][0]["status"], "active")
        self.assertEqual(res.data["stages"][1]["status"], "locked")

    def test_manager_fills_active_section_and_stage_gate(self):
        self.client.force_authenticate(self.admin)
        res = self.client.post(
            "/api/projectdocs/dossiers/",
            {
                "project_id": self.project.id,
                "sponsor_email": "sponsor@test.com",
                "manager_id": self.manager.id,
            },
            format="json",
        )
        dossier_id = res.data["id"]

        self.client.force_authenticate(self.other)
        deny = self.client.patch(
            f"/api/projectdocs/dossiers/{dossier_id}/sections/document/basics/",
            {"data": {"project_name": "س"}},
            format="json",
        )
        self.assertIn(deny.status_code, (403, 404))

        self.client.force_authenticate(self.manager)
        ok = self.client.patch(
            f"/api/projectdocs/dossiers/{dossier_id}/sections/document/basics/",
            {"data": {"project_name": "مشروع تجريبي", "location": "الرياض"}},
            format="json",
        )
        self.assertEqual(ok.status_code, 200, ok.content)
        self.assertEqual(ok.data["status"], "filled")

        locked = self.client.patch(
            f"/api/projectdocs/dossiers/{dossier_id}/sections/document/volunteers/",
            {"data": {"needed_count": 5}},
            format="json",
        )
        self.assertEqual(locked.status_code, 400)

    @patch("projectdocs.services.send_approval_email", return_value=True)
    def test_token_single_use_and_opens_next_stage(self, _mail):
        self.client.force_authenticate(self.admin)
        res = self.client.post(
            "/api/projectdocs/dossiers/",
            {
                "project_id": self.project.id,
                "sponsor_email": "sponsor@test.com",
                "manager_id": self.manager.id,
            },
            format="json",
        )
        dossier_id = res.data["id"]
        self.client.force_authenticate(self.manager)
        sub = self.client.post(f"/api/projectdocs/dossiers/{dossier_id}/stages/1/submit/", {}, format="json")
        self.assertEqual(sub.status_code, 201, sub.content)

        approval = ApprovalRequest.objects.get(dossier_id=dossier_id, decision="pending")
        token = approval.token

        pub = self.client.get(f"/api/public/approvals/{token}/")
        self.assertEqual(pub.status_code, 200)
        self.assertTrue(pub.data["usable"])

        decide = self.client.post(
            f"/api/public/approvals/{token}/decide/",
            {"decision": "approved", "note": ""},
            format="json",
        )
        self.assertEqual(decide.status_code, 200, decide.content)

        reuse = self.client.post(
            f"/api/public/approvals/{token}/decide/",
            {"decision": "approved"},
            format="json",
        )
        self.assertEqual(reuse.status_code, 400)

        dossier = ProjectDossier.objects.get(pk=dossier_id)
        self.assertEqual(dossier.current_stage, "prepare")
        stages = {s.order: s.status for s in dossier.stages.all()}
        self.assertEqual(stages[1], "approved")
        self.assertEqual(stages[2], "active")

    @patch("projectdocs.services.send_approval_email", return_value=True)
    def test_expired_token(self, _mail):
        dossier = create_dossier_for_project(
            project=self.project,
            actor=self.admin,
            card={"sponsor_email": "s@test.com", "manager_id": self.manager.id},
        )
        stage = dossier.stages.get(order=1)
        approval = ApprovalRequest.create_pending(dossier=dossier, scope="stage", stage=stage)
        approval.expires_at = timezone.now() - timedelta(hours=1)
        approval.save(update_fields=["expires_at"])

        res = self.client.post(
            f"/api/public/approvals/{approval.token}/decide/",
            {"decision": "approved"},
            format="json",
        )
        self.assertEqual(res.status_code, 400)

    def test_activity_auto_status(self):
        dossier = create_dossier_for_project(
            project=self.project,
            actor=self.admin,
            card={"sponsor_email": "s@test.com"},
        )
        stage = dossier.stages.get(order=1)
        today = timezone.localdate()
        act = StageActivity(
            stage=stage,
            code="A1",
            title="مهمة",
            start_date=today - timedelta(days=5),
            end_date=today - timedelta(days=1),
            progress_pct=20,
        )
        self.assertEqual(compute_auto_status(act, today), "delayed")
        act.manual_status = "done"
        act.progress_pct = 100
        self.assertEqual(compute_auto_status(act, today), "done")

    def test_schema_endpoint(self):
        self.client.force_authenticate(self.admin)
        res = self.client.get("/api/projectdocs/schema/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data["document"]), 15)

    @patch("projectdocs.services.send_approval_email", return_value=True)
    def test_return_for_revision(self, _mail):
        self.client.force_authenticate(self.admin)
        res = self.client.post(
            "/api/projectdocs/dossiers/",
            {"project_id": self.project.id, "sponsor_email": "sponsor@test.com", "manager_id": self.manager.id},
            format="json",
        )
        dossier_id = res.data["id"]
        self.client.force_authenticate(self.manager)
        self.client.post(f"/api/projectdocs/dossiers/{dossier_id}/stages/1/submit/", {}, format="json")
        token = ApprovalRequest.objects.get(dossier_id=dossier_id, decision="pending").token
        back = self.client.post(
            f"/api/public/approvals/{token}/decide/",
            {"decision": "returned", "note": "أكمل المؤشرات"},
            format="json",
        )
        self.assertEqual(back.status_code, 200)
        stage = ProjectDossier.objects.get(pk=dossier_id).stages.get(order=1)
        self.assertEqual(stage.status, "returned")
        self.assertIn("المؤشرات", stage.return_note)
