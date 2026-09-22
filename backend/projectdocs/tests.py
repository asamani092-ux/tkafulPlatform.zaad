"""
اختبارات ملف المشروع: أقسام، بوابات، توكن اعتماد، صلاحيات، أنشطة، بنود، شواهد.
"""
from datetime import timedelta
from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework.test import APITestCase

from projectdocs.models import (
    ApprovalRequest,
    BudgetLine,
    BudgetTxn,
    DossierAttachment,
    ProjectDossier,
    StageActivity,
)
from projectdocs.sections import DOCUMENT_SECTIONS, CLOSURE_SECTIONS, schema_payload, validate_section_data
from projectdocs.services import (
    allocate_budget_line,
    complete_activity,
    compute_auto_status,
    create_dossier_for_project,
    create_project_with_dossier,
    document_closure_comparison,
    spend_budget_line,
    sync_budget_lines_from_section,
)
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
        self.assertEqual(len(res.data["workspaces"]), 5)
        self.assertEqual(res.data["workspaces"][0]["key"], "card")
        self.assertEqual(res.data["workspaces"][0]["status"], "approved")
        self.assertEqual(res.data["workspaces"][1]["status"], "active")
        self.assertEqual(res.data["workspaces"][2]["status"], "locked")

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

        # الخطة مقفلة قبل اعتماد الوثيقة — لا أنشطة
        stage_id = ProjectDossier.objects.get(pk=dossier_id).stages.first().id
        locked = self.client.post(
            f"/api/projectdocs/dossiers/{dossier_id}/activities/",
            {"stage": stage_id, "code": "A1", "title": "مبكر"},
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
        sub = self.client.post(
            f"/api/projectdocs/dossiers/{dossier_id}/workspaces/document/submit/",
            {},
            format="json",
        )
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
        self.assertEqual(dossier.workspaces.get(key="document").status, "approved")
        self.assertEqual(dossier.workspaces.get(key="plan").status, "active")
        self.assertEqual(dossier.workspaces.get(key="closure").status, "locked")

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
        self.client.post(f"/api/projectdocs/dossiers/{dossier_id}/workspaces/document/submit/", {}, format="json")
        token = ApprovalRequest.objects.get(dossier_id=dossier_id, decision="pending").token
        back = self.client.post(
            f"/api/public/approvals/{token}/decide/",
            {"decision": "returned", "note": "أكمل المؤشرات"},
            format="json",
        )
        self.assertEqual(back.status_code, 200)
        ws = ProjectDossier.objects.get(pk=dossier_id).workspaces.get(key="document")
        self.assertEqual(ws.status, "returned")
        self.assertIn("المؤشرات", ws.return_note)


class DossierRestructureTests(APITestCase):
    """مسار الهيكل الجديد: إنشاء بالاسم+الراعي، بنود، خصم، شواهد، مقارنة، بلا Excel."""

    def setUp(self):
        self.admin = make_user("admin2", role="admin")
        self.manager = make_user("mgr2", role="user")

    def test_create_by_name_and_sponsor(self):
        self.client.force_authenticate(self.admin)
        res = self.client.post(
            "/api/projectdocs/dossiers/",
            {
                "name": "مشروع راعي جديد",
                "sponsor_name": "مدير الإدارة",
                "sponsor_email": "sponsor2@test.com",
            },
            format="json",
        )
        self.assertEqual(res.status_code, 201, res.content)
        self.assertTrue(res.data["project_slug"])
        self.assertEqual(res.data["sponsor_email"], "sponsor2@test.com")
        self.assertTrue(Project.objects.filter(slug=res.data["project_slug"]).exists())
        self.assertEqual(len(res.data["stages"]), 5)

    def test_locked_stage_blocks_work_until_manager_approval(self):
        """قفل تبويب الخطة حتى اعتماد الوثيقة؛ مفتوح لمدير الإدارة. O(1)."""
        self.client.force_authenticate(self.admin)
        res = self.client.post(
            "/api/projectdocs/dossiers/",
            {
                "name": "تراتبية",
                "sponsor_email": "gate@test.com",
                "sponsor_name": "مدير",
                "manager_id": self.manager.id,
            },
            format="json",
        )
        dossier_id = res.data["id"]
        self.assertEqual(len(res.data["workspaces"]), 5)
        by_key = {w["key"]: w for w in res.data["workspaces"]}
        self.assertEqual(by_key["card"]["status"], "approved")
        self.assertEqual(by_key["document"]["status"], "active")
        self.assertEqual(by_key["plan"]["status"], "locked")

        # الموظف/مدير المشروع: نشاط على الخطة مرفوض قبل اعتماد الوثيقة
        self.client.force_authenticate(self.manager)
        # عيّن المدير على الملف
        from projectdocs.models import ProjectDossier

        ProjectDossier.objects.filter(pk=dossier_id).update(manager=self.manager)
        stage = next(s for s in res.data["stages"] if s["order"] == 1)
        deny_act = self.client.post(
            f"/api/projectdocs/dossiers/{dossier_id}/activities/",
            {"stage": stage["id"], "code": "X1", "title": "محظور"},
            format="json",
        )
        self.assertEqual(deny_act.status_code, 400, deny_act.content)

        # مدير الإدارة يتجاوز القفل
        sponsor_user = make_user("deptmgr", role="user")
        sponsor_user.email = "gate@test.com"
        sponsor_user.save(update_fields=["email"])
        self.client.force_authenticate(sponsor_user)
        # الراعي ليس manager — يجب أن يُرفض التعديل بصلاحية التحرير
        # المشرف يتجاوز ويعتمد الوثيقة ثم تُفتح الخطة
        self.client.force_authenticate(self.admin)
        with patch("projectdocs.services.send_approval_email", return_value=True):
            sub = self.client.post(
                f"/api/projectdocs/dossiers/{dossier_id}/workspaces/document/submit/",
                {},
                format="json",
            )
        self.assertEqual(sub.status_code, 201, sub.content)
        dec = self.client.post(
            f"/api/projectdocs/dossiers/{dossier_id}/workspaces/document/decide/",
            {"decision": "approved"},
            format="json",
        )
        self.assertEqual(dec.status_code, 200, dec.content)
        dossier = ProjectDossier.objects.get(pk=dossier_id)
        self.assertEqual(dossier.workspaces.get(key="document").status, "approved")
        self.assertEqual(dossier.workspaces.get(key="plan").status, "active")
        self.assertEqual(dossier.workspaces.get(key="closure").status, "locked")

    def test_pm_who_is_sponsor_bypasses_locks(self):
        """مدير المشروع إن كان مدير الإدارة (نفس البريد) يفتح التبويبات المقفلة. O(1)."""
        self.manager.email = "both@test.com"
        self.manager.save(update_fields=["email"])
        self.client.force_authenticate(self.admin)
        res = self.client.post(
            "/api/projectdocs/dossiers/",
            {
                "name": "راعي ومدير",
                "sponsor_email": "both@test.com",
                "sponsor_name": "نفس الشخص",
                "manager_id": self.manager.id,
            },
            format="json",
        )
        self.assertEqual(res.status_code, 201, res.content)
        dossier_id = res.data["id"]
        self.assertTrue(res.data["bypass_workspace_gates"])  # المشرف

        self.client.force_authenticate(self.manager)
        detail = self.client.get(f"/api/projectdocs/dossiers/{dossier_id}/")
        self.assertEqual(detail.status_code, 200)
        self.assertTrue(detail.data["bypass_workspace_gates"])
        by_key = {w["key"]: w for w in detail.data["workspaces"]}
        self.assertEqual(by_key["plan"]["status"], "locked")  # الحالة الحقيقية تبقى مقفلة

        stage = next(s for s in detail.data["stages"] if s["order"] == 1)
        ok_act = self.client.post(
            f"/api/projectdocs/dossiers/{dossier_id}/activities/",
            {"stage": stage["id"], "code": "Y1", "title": "مسموح للراعي-المدير"},
            format="json",
        )
        self.assertEqual(ok_act.status_code, 201, ok_act.content)

        # موظف عادي (مدير مشروع فقط، بريد مختلف) يبقى مقفولاً
        plain_pm = make_user("plainpm", role="user")
        plain_pm.email = "plain@test.com"
        plain_pm.save(update_fields=["email"])
        from projectdocs.models import ProjectDossier

        ProjectDossier.objects.filter(pk=dossier_id).update(manager=plain_pm, sponsor_email="both@test.com")
        self.client.force_authenticate(plain_pm)
        deny = self.client.post(
            f"/api/projectdocs/dossiers/{dossier_id}/activities/",
            {"stage": stage["id"], "code": "Y2", "title": "مرفوض"},
            format="json",
        )
        self.assertEqual(deny.status_code, 400, deny.content)

    def test_by_project_exposes_bypass_for_admin(self):
        """by-project يمرّر سياق الطلب حتى يظهر bypass للمشرف. O(1)."""
        self.client.force_authenticate(self.admin)
        res = self.client.post(
            "/api/projectdocs/dossiers/",
            {"name": "سياق", "sponsor_email": "ctx@test.com", "sponsor_name": "راعٍ"},
            format="json",
        )
        self.assertEqual(res.status_code, 201, res.content)
        slug = res.data["project_slug"]
        by = self.client.get(f"/api/projectdocs/dossiers/by-project/{slug}/")
        self.assertEqual(by.status_code, 200)
        self.assertTrue(by.data["bypass_workspace_gates"])
        self.assertEqual(by.data["workspaces"][2]["status"], "locked")

    def test_budget_lines_cumulative_allocate_spend(self):
        dossier = create_project_with_dossier(
            name="ميزانية",
            sponsor_name="راعٍ",
            sponsor_email="sponsor@test.com",
            actor=self.admin,
        )
        # فتح مرحلة التخطيط يدوياً للاختبار الداخلي للمزامنة
        sync_budget_lines_from_section(
            dossier,
            {
                "association_budget": 1000,
                "donation_budget": 500,
                "total_budget": 1500,
                "lines": [
                    {"item": "تجهيز", "amount": 400, "source": "جمعية"},
                    {"item": "نقل", "amount": 200},
                ],
            },
            user=self.admin,
        )
        self.assertEqual(dossier.budget_lines.count(), 2)
        # إضافة تراكمية: بند جديد لا يستبدل القديم
        sync_budget_lines_from_section(
            dossier,
            {"lines": [{"item": "تجهيز", "amount": 400}, {"item": "ضيافة", "amount": 100}]},
            user=self.admin,
        )
        self.assertEqual(dossier.budget_lines.count(), 3)

        line = dossier.budget_lines.get(title="تجهيز")
        allocate_budget_line(dossier=dossier, line_id=line.id, amount=350, user=self.admin)
        line.refresh_from_db()
        self.assertEqual(line.allocated_amount, Decimal("350"))

        spend_budget_line(dossier=dossier, line_id=line.id, amount=100, user=self.admin, note="دفعة1")
        spend_budget_line(dossier=dossier, line_id=line.id, amount=50, user=self.admin, note="دفعة2")
        line.refresh_from_db()
        self.assertEqual(line.spent_amount, Decimal("150"))
        self.assertEqual(BudgetTxn.objects.filter(line=line, kind="spend").count(), 2)

        with self.assertRaises(Exception):
            spend_budget_line(dossier=dossier, line_id=line.id, amount=300, user=self.admin)

    def test_allocate_permission_sponsor_or_admin(self):
        dossier = create_project_with_dossier(
            name="صلاحية مخصص",
            sponsor_name="راعٍ",
            sponsor_email="sponsor@test.com",
            actor=self.admin,
        )
        line = BudgetLine.objects.create(dossier=dossier, title="بند", proposed_amount=100)
        other = make_user("outsider", role="user")
        with self.assertRaises(Exception):
            allocate_budget_line(dossier=dossier, line_id=line.id, amount=80, user=other)

        sponsor_user = make_user("sponsoru", role="user")
        sponsor_user.email = "sponsor@test.com"
        sponsor_user.save(update_fields=["email"])
        allocate_budget_line(dossier=dossier, line_id=line.id, amount=80, user=sponsor_user)
        line.refresh_from_db()
        self.assertEqual(line.allocated_amount, Decimal("80"))

    def test_complete_activity_requires_evidence_and_lessons(self):
        dossier = create_dossier_for_project(
            project=Project.objects.create(name="شواهد", slug="ev-demo", status="active"),
            actor=self.admin,
            card={"sponsor_email": "s@test.com", "manager_id": self.manager.id},
        )
        stage = dossier.stages.get(order=1)
        act = StageActivity.objects.create(stage=stage, code="E1", title="نشاط", manual_status="in_progress")
        with self.assertRaises(Exception):
            complete_activity(dossier=dossier, activity=act, user=self.admin, lessons="درس")
        with self.assertRaises(Exception):
            complete_activity(
                dossier=dossier,
                activity=act,
                user=self.admin,
                evidence_url="https://example.com/proof.pdf",
            )
        complete_activity(
            dossier=dossier,
            activity=act,
            user=self.admin,
            lessons="تعلّمنا التنسيق المبكر",
            evidence_url="https://example.com/proof.pdf",
        )
        act.refresh_from_db()
        self.assertEqual(act.manual_status, "done")
        self.assertEqual(act.progress_pct, 100)
        self.assertTrue(DossierAttachment.objects.filter(activity=act).exists())

    def test_document_closure_comparison_endpoint(self):
        self.client.force_authenticate(self.admin)
        res = self.client.post(
            "/api/projectdocs/dossiers/",
            {"name": "مقارنة", "sponsor_email": "c@test.com", "sponsor_name": "راعٍ"},
            format="json",
        )
        dossier_id = res.data["id"]
        cmp = self.client.get(f"/api/projectdocs/dossiers/{dossier_id}/comparison/")
        self.assertEqual(cmp.status_code, 200)
        self.assertIn("pairs", cmp.data)
        self.assertGreaterEqual(len(cmp.data["pairs"]), 5)
        payload = document_closure_comparison(ProjectDossier.objects.get(pk=dossier_id))
        self.assertEqual(payload["pairs"][0]["document_key"], "basics")

    def test_no_excel_routes_in_projectdocs(self):
        from django.urls import get_resolver

        patterns = []

        def walk(urlpatterns, prefix=""):
            for p in urlpatterns:
                if hasattr(p, "url_patterns"):
                    walk(p.url_patterns, prefix + str(p.pattern))
                else:
                    patterns.append(prefix + str(p.pattern))

        walk(get_resolver().url_patterns)
        joined = "\n".join(patterns).lower()
        projectdocs_lines = [ln for ln in patterns if "projectdocs" in ln.lower() or "dossier" in ln.lower()]
        blob = "\n".join(projectdocs_lines).lower()
        self.assertNotIn("excel", blob)
        self.assertNotIn("xlsx", blob)
        self.assertNotIn("import_excel", joined)
