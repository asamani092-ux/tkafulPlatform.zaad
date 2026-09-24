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
from projectdocs.sections import (
    CARD_SECTIONS,
    DOCUMENT_SECTIONS,
    CLOSURE_SECTIONS,
    schema_payload,
    validate_section_data,
)
from projectdocs.services import (
    allocate_budget_line,
    complete_activity,
    compute_auto_status,
    create_dossier_for_project,
    create_project_with_dossier,
    document_closure_comparison,
    spend_budget_line,
    sync_budget_lines_from_section,
    sync_document_from_card,
)
from projectdocs.sections import DOCUMENT_SECTIONS as DOC_SECS
from projects.models import Project


def fill_all_document_sections(client, dossier_id):
    """تعبئة حد أدنى لكل بطاقات الوثيقة قبل الإرسال. O(S)."""
    payloads = {
        "basics": {
            "marketing_name": "اسم",
            "department": "إدارة",
            "section": "قسم",
            "location": "موقع",
            "execution_start": "2026-01-01",
            "execution_end": "2026-12-31",
            "sponsor_name": "راعي",
            "sponsor_email": "s@test.com",
            "strategic_goal": "هدف",
        },
        "indicators": {"rows": [{"goal": "غ", "indicator_name": "م", "target": "1"}]},
        "logical_impact": {
            "rows": [
                {
                    "row_key": "impact",
                    "label": "الأثر",
                    "description": "د",
                    "indicators": "م",
                    "means": "و",
                    "assumptions": "ا",
                },
                {
                    "row_key": "returns",
                    "label": "العوائد والغايات",
                    "description": "د",
                    "indicators": "م",
                    "means": "و",
                    "assumptions": "ا",
                },
            ]
        },
        "outputs_quality": {"rows": [{"output": "مخرج", "quality": "جودة"}]},
        "main_phases": {
            "phases": [
                {"key": p["key"], "label": p["label"], "activities": ["نشاط"]}
                for p in [
                    {"key": "define", "label": "تحديد وتعريف المشروع"},
                    {"key": "prepare", "label": "إعداد المشروع"},
                    {"key": "plan", "label": "التخطيط للمشروع"},
                    {"key": "execute", "label": "تنفيذ المشروع"},
                    {"key": "close", "label": "إغلاق المشروع"},
                ]
            ]
        },
        "objectives": {"rows": [{"objective": "هدف", "indicator": "مؤشر"}]},
        "aspirations": {"short_term": "ق", "long_term": "ط", "impact": "أ"},
        "similar_experiences": {
            "rows": [{"org": "ج", "project_name": "م", "highlight": "ت", "addition_point": "ن"}],
            "target_group": "فئة",
            "beneficiaries_count": 10,
        },
        "risks": {"rows": [{"risk": "خطر", "response": "استجابة"}]},
        "team": {
            "rows": [
                {
                    "name": "عضو",
                    "job_title": "وظيفة",
                    "phone": "05",
                    "email": "a@t.local",
                    "main_tasks": "مهام",
                    "user_id": "",
                }
            ]
        },
        "volunteers": {"rows": [{"volunteers_count": 2, "hours_count": 5, "main_tasks": "م"}]},
        "stakeholders": {
            "rows": [{"name": "جهة", "intro": "تعريف", "intersection": "تقاطع", "management": "إدارة"}]
        },
        "budget": {
            "card_allocation": [],
            "lines": [
                {
                    "phase_key": "define",
                    "activity": "ن",
                    "statement": "ب",
                    "quantity": 1,
                    "unit_price": 10,
                    "line_total": 10,
                }
            ],
            "lines_grand_total": 10,
        },
    }
    for key in [s["key"] for s in DOC_SECS]:
        data = payloads.get(key) or {}
        res = client.patch(
            f"/api/projectdocs/dossiers/{dossier_id}/sections/document/{key}/",
            {"data": data},
            format="json",
        )
        assert res.status_code == 200, f"{key}: {res.content}"


def approve_card_workspace(client, dossier_id):
    """اعتماد البطاقة لفتح الوثيقة. O(1)."""
    res = client.post(
        f"/api/projectdocs/dossiers/{dossier_id}/workspaces/card/decide/",
        {"decision": "approved"},
        format="json",
    )
    assert res.status_code == 200, res.content


def make_user(username, role="user"):
    user = User.objects.create_user(username=username, email=f"{username}@t.local", password="pass12345")
    user.profile.role = role
    user.profile.save()
    return user


class SectionsCatalogTests(APITestCase):
    def test_catalog_counts(self):
        self.assertEqual(len(DOCUMENT_SECTIONS), 13)
        self.assertEqual(len(CLOSURE_SECTIONS), 11)
        self.assertEqual(len(CARD_SECTIONS), 5)
        payload = schema_payload()
        self.assertEqual(len(payload["stages"]), 5)
        self.assertEqual(len(payload["document"]), 13)
        self.assertEqual(len(payload["closure"]), 11)
        self.assertEqual(len(payload["card"]), 5)
        self.assertEqual(len(payload["document_fixed_phases"]), 5)

    def test_validate_rejects_unknown_keys(self):
        with self.assertRaises(Exception):
            validate_section_data("document", "basics", {"nope": "x"})

    def test_validate_table(self):
        cleaned = validate_section_data(
            "document",
            "indicators",
            {"rows": [{"goal": "أ", "indicator_name": "م", "target": "10"}]},
        )
        self.assertEqual(cleaned["rows"][0]["goal"], "أ")

    def test_logical_matrix_and_phases(self):
        matrix = validate_section_data("document", "logical_impact", {"rows": []})
        self.assertEqual(len(matrix["rows"]), 2)
        phases = validate_section_data("document", "main_phases", {"phases": []})
        self.assertEqual(len(phases["phases"]), 5)

    def test_card_phase_budget_total_computed(self):
        cleaned = validate_section_data(
            "card",
            "phases",
            {
                "rows": [
                    {
                        "activity_type": "تدريب",
                        "executor": "فريق",
                        "start_date": "2026-01-01",
                        "end_date": "2026-01-31",
                        "output": "دورة",
                        "budget_association": 100,
                        "budget_donation": 50,
                    }
                ]
            },
        )
        self.assertEqual(cleaned["rows"][0]["budget_total"], 150.0)


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
        self.assertEqual(len(res.data["sections"]), 34)
        self.assertEqual(len(res.data["stages"]), 5)
        self.assertEqual(len(res.data["workspaces"]), 5)
        self.assertEqual(res.data["workspaces"][0]["key"], "card")
        self.assertEqual(res.data["workspaces"][0]["status"], "active")
        self.assertEqual(res.data["workspaces"][1]["status"], "locked")
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
            {"data": {"marketing_name": "س"}},
            format="json",
        )
        self.assertIn(deny.status_code, (403, 404))

        self.client.force_authenticate(self.manager)
        ok = self.client.patch(
            f"/api/projectdocs/dossiers/{dossier_id}/sections/document/basics/",
            {
                "data": {
                    "marketing_name": "مشروع تجريبي",
                    "department": "إدارة",
                    "section": "قسم",
                    "location": "الرياض",
                    "execution_start": "2026-01-01",
                    "execution_end": "2026-12-31",
                    "sponsor_name": "راعي",
                    "sponsor_email": "sponsor@test.com",
                    "strategic_goal": "هدف",
                }
            },
            format="json",
        )
        self.assertEqual(ok.status_code, 200, ok.content)
        self.assertEqual(ok.data["status"], "filled")

        # الخطة مقفلة قبل اعتماد الوثيقة — الراعي ليس المدير فلا يضيف نشاطاً
        stage_id = ProjectDossier.objects.get(pk=dossier_id).stages.first().id
        sponsor = make_user("cardsponsor", role="user")
        sponsor.email = "sponsor@test.com"
        sponsor.save(update_fields=["email"])
        self.client.force_authenticate(sponsor)
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
        approve_card_workspace(self.client, dossier_id)
        fill_all_document_sections(self.client, dossier_id)
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
        self.assertEqual(len(res.data["document"]), 13)
        self.assertEqual(len(res.data["document_fixed_phases"]), 5)

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
        approve_card_workspace(self.client, dossier_id)
        fill_all_document_sections(self.client, dossier_id)
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
        self.assertEqual(by_key["card"]["status"], "active")
        self.assertEqual(by_key["document"]["status"], "locked")
        self.assertEqual(by_key["plan"]["status"], "locked")

        # الراعي ليس المدير: نشاط على الخطة مرفوض قبل اعتماد الوثيقة
        sponsor_user = make_user("deptmgr", role="user")
        sponsor_user.email = "gate@test.com"
        sponsor_user.save(update_fields=["email"])
        self.client.force_authenticate(sponsor_user)
        stage = next(s for s in res.data["stages"] if s["order"] == 1)
        deny_act = self.client.post(
            f"/api/projectdocs/dossiers/{dossier_id}/activities/",
            {"stage": stage["id"], "code": "X1", "title": "محظور"},
            format="json",
        )
        self.assertEqual(deny_act.status_code, 400, deny_act.content)

        # المشرف يعتمد الوثيقة ثم تُفتح الخطة
        self.client.force_authenticate(self.manager)
        approve_card_workspace(self.client, dossier_id)
        fill_all_document_sections(self.client, dossier_id)
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

        # الراعي بعد نقل الإدارة لشخص آخر يبقى مقفولاً
        from projectdocs.models import ProjectDossier

        plain_pm = make_user("plainpm", role="user")
        ProjectDossier.objects.filter(pk=dossier_id).update(manager=plain_pm, sponsor_email="both@test.com")
        self.client.force_authenticate(self.manager)
        deny = self.client.post(
            f"/api/projectdocs/dossiers/{dossier_id}/activities/",
            {"stage": stage["id"], "code": "Y2", "title": "مرفوض"},
            format="json",
        )
        self.assertEqual(deny.status_code, 400, deny.content)

    def test_admin_decide_consumes_pending_email_token(self):
        """القرار الداخلي يستهلك طلب الإيميل القائم فلا يبقى الرمز صالحاً. O(1)."""
        self.client.force_authenticate(self.admin)
        res = self.client.post(
            "/api/projectdocs/dossiers/",
            {
                "name": "رمز داخلي",
                "sponsor_email": "tok@test.com",
                "sponsor_name": "راعٍ",
                "manager_id": self.manager.id,
            },
            format="json",
        )
        dossier_id = res.data["id"]
        with patch("projectdocs.services.send_approval_email", return_value=True):
            self.client.force_authenticate(self.manager)
            approve_card_workspace(self.client, dossier_id)
            fill_all_document_sections(self.client, dossier_id)
            sub = self.client.post(
                f"/api/projectdocs/dossiers/{dossier_id}/workspaces/document/submit/",
                {},
                format="json",
            )
        self.assertEqual(sub.status_code, 201, sub.content)
        pending = ApprovalRequest.objects.get(dossier_id=dossier_id, decision="pending")
        token = pending.token
        self.client.force_authenticate(self.admin)
        dec = self.client.post(
            f"/api/projectdocs/dossiers/{dossier_id}/workspaces/document/decide/",
            {"decision": "approved"},
            format="json",
        )
        self.assertEqual(dec.status_code, 200, dec.content)
        pending.refresh_from_db()
        self.assertEqual(pending.decision, "approved")
        reuse = self.client.post(
            f"/api/public/approvals/{token}/decide/",
            {"decision": "returned", "note": "متأخر"},
            format="json",
        )
        self.assertEqual(reuse.status_code, 400)

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
        section = dossier.sections.get(kind="closure", key="lessons_learned")
        self.assertEqual(section.data["lessons"][0]["lesson"], "تعلّمنا التنسيق المبكر")
        self.assertEqual(section.data["lessons"][0]["activity_code"], "E1")
        complete_activity(
            dossier=dossier,
            activity=act,
            user=self.admin,
            lessons="درس ثانٍ",
            evidence_url="https://example.com/proof.pdf",
        )
        section.refresh_from_db()
        self.assertEqual(len(section.data["lessons"]), 2)
        self.assertEqual(section.data["lessons"][0]["lesson"], "تعلّمنا التنسيق المبكر")

    def test_status_done_requires_evidence_and_child_can_complete(self):
        from django.core.files.uploadedfile import SimpleUploadedFile

        self.client.force_authenticate(self.admin)
        res = self.client.post(
            "/api/projectdocs/dossiers/",
            {"name": "إتمام فرعي", "sponsor_email": "child@test.com", "sponsor_name": "راعٍ"},
            format="json",
        )
        self.assertEqual(res.status_code, 201, res.content)
        dossier_id = res.data["id"]
        stage_id = res.data["stages"][0]["id"]
        parent = self.client.post(
            f"/api/projectdocs/dossiers/{dossier_id}/activities/",
            {"stage": stage_id, "title": "رئيسي"},
            format="json",
        )
        self.assertEqual(parent.status_code, 201, parent.content)
        child = self.client.post(
            f"/api/projectdocs/dossiers/{dossier_id}/activities/",
            {"parent": parent.data["id"], "title": "فرعي"},
            format="json",
        )
        self.assertEqual(child.status_code, 201, child.content)
        skipped = self.client.patch(
            f"/api/projectdocs/dossiers/{dossier_id}/activities/{child.data['id']}/",
            {"manual_status": "done"},
            format="json",
        )
        self.assertEqual(skipped.status_code, 400, skipped.content)
        blank_url = self.client.post(
            f"/api/projectdocs/dossiers/{dossier_id}/activities/{child.data['id']}/complete/",
            {"lessons": "درس الفرع", "evidence_url": "", "file": SimpleUploadedFile("شاهد.txt", b"proof")},
            format="multipart",
        )
        self.assertEqual(blank_url.status_code, 200, blank_url.content)
        self.assertEqual(blank_url.data["manual_status"], "done")
        self.assertEqual(blank_url.data["parent"], parent.data["id"])

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

    def test_card_fields_tables_and_info_page(self):
        """حفظ حقول البطاقة وجداولها وعكسها في صفحة المعلومات. O(1)."""
        self.client.force_authenticate(self.admin)
        res = self.client.post(
            "/api/projectdocs/dossiers/",
            {
                "name": "بطاقة كاملة",
                "sponsor_email": "card@test.com",
                "sponsor_name": "راعٍ",
                "manager_id": self.manager.id,
            },
            format="json",
        )
        self.assertEqual(res.status_code, 201, res.content)
        dossier_id = res.data["id"]
        card_keys = {s["key"] for s in res.data["sections"] if s["kind"] == "card"}
        self.assertEqual(
            card_keys,
            {"indicators", "phases", "outputs", "similar_experiences", "project_budget"},
        )

        patch = self.client.patch(
            f"/api/projectdocs/dossiers/{dossier_id}/",
            {
                "marketing_name": "اسم العرض",
                "department": "التكافل",
                "section": "القسم أ",
                "strategic_goal": "هدف",
                "location": "الرياض",
                "execution_start": "2026-03-01",
                "execution_end": "2026-09-01",
                "sponsor_name": "مدير الإدارة",
                "sponsor_email": "card@test.com",
            },
            format="json",
        )
        self.assertEqual(patch.status_code, 200, patch.content)
        self.assertEqual(patch.data["execution_start"], "2026-03-01")
        self.assertEqual(patch.data["marketing_name"], "اسم العرض")

        ind = self.client.patch(
            f"/api/projectdocs/dossiers/{dossier_id}/sections/card/indicators/",
            {
                "data": {
                    "rows": [
                        {"goal": "تمكين", "indicator_name": "عدد المستفيدين", "target": "100"},
                    ]
                }
            },
            format="json",
        )
        self.assertEqual(ind.status_code, 200, ind.content)

        ph = self.client.patch(
            f"/api/projectdocs/dossiers/{dossier_id}/sections/card/phases/",
            {
                "data": {
                    "rows": [
                        {
                            "activity_type": "تنفيذ",
                            "executor": "فريق أ",
                            "start_date": "2026-03-01",
                            "end_date": "2026-04-01",
                            "output": "تقرير",
                            "budget_association": 200,
                            "budget_donation": 100,
                        }
                    ]
                }
            },
            format="json",
        )
        self.assertEqual(ph.status_code, 200, ph.content)
        self.assertEqual(ph.data["data"]["rows"][0]["budget_total"], 300.0)

        bud = self.client.patch(
            f"/api/projectdocs/dossiers/{dossier_id}/sections/card/project_budget/",
            {
                "data": {
                    "rows": [{"from_association": 200, "from_donation": 100}],
                }
            },
            format="json",
        )
        self.assertEqual(bud.status_code, 200, bud.content)
        self.assertEqual(bud.data["data"]["rows"][0]["total"], 300.0)

        info = self.client.get(f"/api/projectdocs/dossiers/{dossier_id}/info-page/")
        self.assertEqual(info.status_code, 200)
        self.assertEqual(info.data["name"], "اسم العرض")
        self.assertEqual(len(info.data["indicators"]), 1)
        self.assertEqual(info.data["indicators"][0]["indicator_name"], "عدد المستفيدين")
        self.assertEqual(info.data["phases_budget_summary"]["total"], 300.0)
        self.assertEqual(info.data["project_budget"][0]["total"], 300.0)

        # لا مسار كتابة على info-page
        bad = self.client.post(f"/api/projectdocs/dossiers/{dossier_id}/info-page/", {}, format="json")
        self.assertIn(bad.status_code, (405, 404))

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


class DocumentTwelveCardsTests(APITestCase):
    """مزامنة البطاقة→الوثيقة، قفل الصفوف، اعتماد لكل بطاقة، ميزانية، فريق."""

    def setUp(self):
        self.admin = make_user("docadmin", role="admin")
        self.manager = make_user("docmgr", role="user")
        self.outsider = make_user("docout", role="user")

    def _create(self):
        self.client.force_authenticate(self.admin)
        res = self.client.post(
            "/api/projectdocs/dossiers/",
            {
                "name": "وثيقة 12",
                "sponsor_email": "sponsor12@test.com",
                "sponsor_name": "راعٍ",
                "manager_id": self.manager.id,
            },
            format="json",
        )
        self.assertEqual(res.status_code, 201, res.content)
        return res.data["id"]

    def test_sync_card_indicators_into_document(self):
        dossier_id = self._create()
        self.client.patch(
            f"/api/projectdocs/dossiers/{dossier_id}/sections/card/indicators/",
            {"data": {"rows": [{"goal": "غ", "indicator_name": "م", "target": "5"}]}},
            format="json",
        )
        detail = self.client.get(f"/api/projectdocs/dossiers/{dossier_id}/")
        doc_ind = next(s for s in detail.data["sections"] if s["kind"] == "document" and s["key"] == "indicators")
        self.assertGreaterEqual(len(doc_ind["data"]["rows"]), 1)
        self.assertTrue(doc_ind["data"]["rows"][0].get("_locked") or doc_ind["data"]["rows"][0].get("_source") == "card")
        self.assertEqual(doc_ind["data"]["rows"][0]["indicator_name"], "م")

    def test_locked_rows_preserved_for_outsider_addition_ok_for_manager(self):
        dossier_id = self._create()
        self.client.patch(
            f"/api/projectdocs/dossiers/{dossier_id}/sections/card/indicators/",
            {"data": {"rows": [{"goal": "غ", "indicator_name": "مقفول", "target": "1"}]}},
            format="json",
        )
        self.client.force_authenticate(self.manager)
        # إضافة صف جديد دون لمس المقفول
        ok = self.client.patch(
            f"/api/projectdocs/dossiers/{dossier_id}/sections/document/indicators/",
            {
                "data": {
                    "rows": [
                        {"goal": "غ", "indicator_name": "مقفول", "target": "1", "_source": "card", "_locked": True},
                        {"goal": "إضافة", "indicator_name": "جديد", "target": "2"},
                    ]
                }
            },
            format="json",
        )
        self.assertEqual(ok.status_code, 200, ok.content)
        self.assertEqual(len(ok.data["data"]["rows"]), 2)

        # خارجي يحاول تعديل المقفول — يُرفض تحرير الملف أصلاً
        self.client.force_authenticate(self.outsider)
        deny = self.client.patch(
            f"/api/projectdocs/dossiers/{dossier_id}/sections/document/indicators/",
            {"data": {"rows": [{"goal": "اختراق", "indicator_name": "x", "target": "9"}]}},
            format="json",
        )
        self.assertIn(deny.status_code, (403, 404))

    def test_per_card_approve_then_workspace(self):
        dossier_id = self._create()
        self.client.force_authenticate(self.admin)
        approve_card_workspace(self.client, dossier_id)
        self.client.force_authenticate(self.manager)
        fill_all_document_sections(self.client, dossier_id)
        self.client.force_authenticate(self.admin)
        keys = [s["key"] for s in DOC_SECS]
        for key in keys[:-1]:
            res = self.client.post(
                f"/api/projectdocs/dossiers/{dossier_id}/sections/document/{key}/decide/",
                {"decision": "approved"},
                format="json",
            )
            self.assertEqual(res.status_code, 200, res.content)
            ws = next(w for w in res.data["workspaces"] if w["key"] == "document")
            self.assertNotEqual(ws["status"], "approved")
        last = self.client.post(
            f"/api/projectdocs/dossiers/{dossier_id}/sections/document/{keys[-1]}/decide/",
            {"decision": "approved"},
            format="json",
        )
        self.assertEqual(last.status_code, 200, last.content)
        ws = next(w for w in last.data["workspaces"] if w["key"] == "document")
        self.assertEqual(ws["status"], "approved")
        dossier = ProjectDossier.objects.get(pk=dossier_id)
        self.assertEqual(dossier.workspaces.get(key="document").status, "approved")
        self.assertEqual(dossier.workspaces.get(key="plan").status, "active")

    def test_document_budget_lines_sync_and_grand_total(self):
        dossier_id = self._create()
        self.client.force_authenticate(self.manager)
        res = self.client.patch(
            f"/api/projectdocs/dossiers/{dossier_id}/sections/document/budget/",
            {
                "data": {
                    "card_allocation": [],
                    "lines": [
                        {
                            "phase_key": "define",
                            "activity": "تخطيط",
                            "statement": "طباعة",
                            "quantity": 2,
                            "unit_price": 50,
                            "line_total": 100,
                        }
                    ],
                }
            },
            format="json",
        )
        self.assertEqual(res.status_code, 200, res.content)
        self.assertEqual(res.data["data"]["lines_grand_total"], 100.0)
        dossier = ProjectDossier.objects.get(pk=dossier_id)
        self.assertTrue(dossier.budget_lines.filter(title="طباعة").exists())

    def test_team_candidates_from_project_members(self):
        from projects.models import ProjectMember

        dossier_id = self._create()
        dossier = ProjectDossier.objects.get(pk=dossier_id)
        ProjectMember.objects.create(project=dossier.project, user=self.manager, role="project_editor")
        self.client.force_authenticate(self.manager)
        res = self.client.get(f"/api/projectdocs/dossiers/{dossier_id}/team-candidates/")
        self.assertEqual(res.status_code, 200)
        rows = res.data["results"] if isinstance(res.data, dict) else res.data
        ids = {row["user_id"] for row in rows}
        self.assertIn(self.manager.id, ids)

    def test_main_phases_always_five(self):
        cleaned = validate_section_data(
            "document",
            "main_phases",
            {"phases": [{"key": "define", "label": "x", "activities": ["أ"]}]},
        )
        self.assertEqual(len(cleaned["phases"]), 5)
        self.assertEqual(cleaned["phases"][0]["activities"], ["أ"])

    def test_card_scalars_appear_on_document_basics(self):
        dossier_id = self._create()
        self.client.patch(
            f"/api/projectdocs/dossiers/{dossier_id}/",
            {"marketing_name": "من البطاقة", "location": "جدة", "department": "التكافل"},
            format="json",
        )
        detail = self.client.get(f"/api/projectdocs/dossiers/{dossier_id}/")
        basics = next(s for s in detail.data["sections"] if s["kind"] == "document" and s["key"] == "basics")
        self.assertEqual(basics["data"]["marketing_name"], "من البطاقة")
        self.assertEqual(basics["data"]["location"], "جدة")

    def test_sponsor_does_not_bypass_and_card_starts_active(self):
        dossier_id = self._create()
        detail = self.client.get(f"/api/projectdocs/dossiers/{dossier_id}/")
        by_key = {w["key"]: w for w in detail.data["workspaces"]}
        self.assertEqual(by_key["card"]["status"], "active")
        self.assertEqual(by_key["document"]["status"], "locked")
        sponsor = make_user("sponsoronly", role="user")
        sponsor.email = "sponsor12@test.com"
        sponsor.save(update_fields=["email"])
        self.client.force_authenticate(sponsor)
        seen = self.client.get(f"/api/projectdocs/dossiers/{dossier_id}/")
        self.assertEqual(seen.status_code, 200)
        self.assertFalse(seen.data["bypass_workspace_gates"])
        blocked = self.client.patch(
            f"/api/projectdocs/dossiers/{dossier_id}/sections/document/objectives/",
            {"data": {"rows": [{"objective": "س", "indicator": "م"}]}},
            format="json",
        )
        self.assertEqual(blocked.status_code, 400, blocked.content)


class PlanFromPhasesTests(APITestCase):
    """مزامنة أنشطة الوثيقة إلى الخطة، قفل العنوان، واعتماد المراحل. O(P+A)."""

    def setUp(self):
        self.admin = make_user("planadmin", role="admin")
        self.manager = make_user("planmgr", role="user")

    def _create(self):
        self.client.force_authenticate(self.admin)
        res = self.client.post(
            "/api/projectdocs/dossiers/",
            {
                "name": "خطة",
                "sponsor_email": "plan@test.com",
                "sponsor_name": "راعٍ",
                "manager_id": self.manager.id,
            },
            format="json",
        )
        self.assertEqual(res.status_code, 201, res.content)
        return res.data["id"]

    def _phases(self, activities):
        return {
            "phases": [
                {"key": "define", "label": "تحديد وتعريف المشروع", "activities": activities},
                {"key": "prepare", "label": "إعداد المشروع", "activities": []},
                {"key": "plan", "label": "التخطيط للمشروع", "activities": []},
                {"key": "execute", "label": "تنفيذ المشروع", "activities": []},
                {"key": "close", "label": "إغلاق المشروع", "activities": []},
            ]
        }

    def test_sync_locks_title_and_keeps_row_after_chip_removed(self):
        dossier_id = self._create()
        saved = self.client.patch(
            f"/api/projectdocs/dossiers/{dossier_id}/sections/document/main_phases/",
            {"data": self._phases(["حفر"])},
            format="json",
        )
        self.assertEqual(saved.status_code, 200, saved.content)
        listed = self.client.get(f"/api/projectdocs/dossiers/{dossier_id}/activities/")
        self.assertEqual(listed.status_code, 200, listed.content)
        row = next(a for a in listed.data if a["title"] == "حفر")
        self.assertTrue(row["locked"])
        self.assertEqual(row["source"], "document")
        self.assertIsNone(row["parent"])

        renamed = self.client.patch(
            f"/api/projectdocs/dossiers/{dossier_id}/activities/{row['id']}/",
            {"title": "عنوان آخر"},
            format="json",
        )
        self.assertEqual(renamed.status_code, 400, renamed.content)
        removed = self.client.delete(f"/api/projectdocs/dossiers/{dossier_id}/activities/{row['id']}/")
        self.assertEqual(removed.status_code, 400, removed.content)

        child = self.client.post(
            f"/api/projectdocs/dossiers/{dossier_id}/activities/",
            {"parent": row["id"], "title": "فرعي"},
            format="json",
        )
        self.assertEqual(child.status_code, 201, child.content)
        self.assertEqual(child.data["parent"], row["id"])
        self.assertFalse(child.data["locked"])

        self.client.patch(
            f"/api/projectdocs/dossiers/{dossier_id}/sections/document/main_phases/",
            {"data": self._phases([])},
            format="json",
        )
        again = self.client.get(f"/api/projectdocs/dossiers/{dossier_id}/activities/")
        titles = [a["title"] for a in again.data]
        self.assertIn("حفر", titles)
        self.assertIn("فرعي", titles)

    def test_plan_workspace_requires_five_phase_approvals(self):
        dossier_id = self._create()
        approve_card_workspace(self.client, dossier_id)
        self.client.force_authenticate(self.manager)
        fill_all_document_sections(self.client, dossier_id)
        self.client.force_authenticate(self.admin)
        for key in [s["key"] for s in DOC_SECS]:
            res = self.client.post(
                f"/api/projectdocs/dossiers/{dossier_id}/sections/document/{key}/decide/",
                {"decision": "approved"},
                format="json",
            )
            self.assertEqual(res.status_code, 200, res.content)
        early = self.client.post(
            f"/api/projectdocs/dossiers/{dossier_id}/workspaces/plan/decide/",
            {"decision": "approved"},
            format="json",
        )
        self.assertEqual(early.status_code, 400, early.content)
        keys = ["define", "prepare", "plan", "execute", "close"]
        last = None
        for key in keys:
            last = self.client.post(
                f"/api/projectdocs/dossiers/{dossier_id}/sections/plan/{key}/decide/",
                {"decision": "approved"},
                format="json",
            )
            self.assertEqual(last.status_code, 200, last.content)
        ws = next(w for w in last.data["workspaces"] if w["key"] == "plan")
        self.assertEqual(ws["status"], "approved")

    def test_rejects_start_not_before_end(self):
        dossier_id = self._create()
        saved = self.client.patch(
            f"/api/projectdocs/dossiers/{dossier_id}/sections/document/main_phases/",
            {"data": self._phases(["حفر"])},
            format="json",
        )
        self.assertEqual(saved.status_code, 200, saved.content)
        listed = self.client.get(f"/api/projectdocs/dossiers/{dossier_id}/activities/")
        row = next(a for a in listed.data if a["title"] == "حفر")
        inverted = self.client.patch(
            f"/api/projectdocs/dossiers/{dossier_id}/activities/{row['id']}/",
            {"start_date": "2026-06-01", "end_date": "2026-05-01"},
            format="json",
        )
        self.assertEqual(inverted.status_code, 400, inverted.content)
        same = self.client.patch(
            f"/api/projectdocs/dossiers/{dossier_id}/activities/{row['id']}/",
            {"start_date": "2026-05-01", "end_date": "2026-05-01"},
            format="json",
        )
        self.assertEqual(same.status_code, 400, same.content)
        ok = self.client.patch(
            f"/api/projectdocs/dossiers/{dossier_id}/activities/{row['id']}/",
            {"start_date": "2026-05-01", "end_date": "2026-06-30"},
            format="json",
        )
        self.assertEqual(ok.status_code, 200, ok.content)
        dossier = self.client.get(f"/api/projectdocs/dossiers/{dossier_id}/")
        order = next(s["order"] for s in dossier.data["stages"] if s["key"] == "define")
        bad_stage = self.client.patch(
            f"/api/projectdocs/dossiers/{dossier_id}/stages/{order}/",
            {"planned_start": "2026-06-01", "planned_end": "2026-05-01"},
            format="json",
        )
        self.assertEqual(bad_stage.status_code, 400, bad_stage.content)

    def test_executed_week_stays_inside_phase_range(self):
        dossier_id = self._create()
        saved = self.client.patch(
            f"/api/projectdocs/dossiers/{dossier_id}/sections/document/main_phases/",
            {"data": self._phases(["حفر"])},
            format="json",
        )
        self.assertEqual(saved.status_code, 200, saved.content)
        listed = self.client.get(f"/api/projectdocs/dossiers/{dossier_id}/activities/")
        row = next(a for a in listed.data if a["title"] == "حفر")
        dossier = self.client.get(f"/api/projectdocs/dossiers/{dossier_id}/")
        order = next(s["order"] for s in dossier.data["stages"] if s["key"] == "define")
        stage = self.client.patch(
            f"/api/projectdocs/dossiers/{dossier_id}/stages/{order}/",
            {"planned_start": "2026-10-10", "planned_end": "2026-12-20"},
            format="json",
        )
        self.assertEqual(stage.status_code, 200, stage.content)
        outside = self.client.patch(
            f"/api/projectdocs/dossiers/{dossier_id}/activities/{row['id']}/",
            {"executed_weeks": ["2026-09-01"]},
            format="json",
        )
        self.assertEqual(outside.status_code, 400, outside.content)
        first = self.client.patch(
            f"/api/projectdocs/dossiers/{dossier_id}/activities/{row['id']}/",
            {"executed_weeks": ["2026-10-01"]},
            format="json",
        )
        self.assertEqual(first.status_code, 200, first.content)
        second = self.client.patch(
            f"/api/projectdocs/dossiers/{dossier_id}/activities/{row['id']}/",
            {"executed_weeks": ["2026-10-01", "2026-10-08"]},
            format="json",
        )
        self.assertEqual(second.status_code, 200, second.content)
        self.assertEqual(second.data["executed_weeks"], ["2026-10-01", "2026-10-08"])
        StageActivity.objects.filter(pk=row["id"]).update(executed_weeks=["2026-06-22", "2026-10-01"])
        kept = self.client.patch(
            f"/api/projectdocs/dossiers/{dossier_id}/activities/{row['id']}/",
            {"executed_weeks": ["2026-06-22", "2026-10-01", "2026-11-01"]},
            format="json",
        )
        self.assertEqual(kept.status_code, 200, kept.content)
        self.assertEqual(kept.data["executed_weeks"], ["2026-10-01", "2026-11-01"])
