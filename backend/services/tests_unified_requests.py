"""UAT Phase 3 — توحيد الطلبات: بذرة نماذج نظامية + مرآة بيانات قديمة + خصوصية."""
from django.contrib.auth.models import User
from rest_framework.test import APITestCase

from projects.models import Project
from services.legacy_forms import (
    SLUG_SERVICE,
    SLUG_SUGGESTION,
    SLUG_WATER,
    SYSTEM_SLUGS,
    backfill_legacy_into_submissions,
    ensure_system_forms,
    reverse_system_forms_and_mirrored,
)
from services.models import RequestForm, RequestSubmission, Service, ServiceRequest, Suggestion, WaterSupplyRequest


class UnifiedRequestFormsTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username="adm@u3.com", email="adm@u3.com", password="Hello12345!"
        )
        self.admin.profile.role = "admin"
        self.admin.profile.save()
        Project.objects.get_or_create(slug="takaful-athar", defaults={"name": "تكافل", "status": "active"})
        Project.objects.get_or_create(slug="saqya", defaults={"name": "سقيا", "status": "active"})
        self.svc = Service.objects.create(title="خدمة", desc="x", service_type="للمستفيدين")

    def test_backfill_preserves_legacy_counts(self):
        ServiceRequest.objects.create(
            service=self.svc, beneficiary_name="أحمد", beneficiary_contact="05", details="d"
        )
        WaterSupplyRequest.objects.create(
            applicant_name="س", mobile_number="05", applicant_role="إمام",
            mosque_name="م", neighborhood="ح", location_link="https://x.test",
            worshippers_count=10,
        )
        Suggestion.objects.create(title="اقتراح", description="وصف", submitted_by="ع")
        legacy_counts = {
            "service": ServiceRequest.objects.count(),
            "water": WaterSupplyRequest.objects.count(),
            "suggestion": Suggestion.objects.count(),
        }
        created = backfill_legacy_into_submissions()
        self.assertEqual(created["service"], legacy_counts["service"])
        self.assertEqual(created["water"], legacy_counts["water"])
        self.assertEqual(created["suggestion"], legacy_counts["suggestion"])
        # الجداول القديمة لم تُحذف
        self.assertEqual(ServiceRequest.objects.count(), legacy_counts["service"])
        self.assertEqual(
            RequestSubmission.objects.filter(form__slug=SLUG_SERVICE).count(),
            legacy_counts["service"],
        )
        # إعادة التشغيل لا تكرّر
        created2 = backfill_legacy_into_submissions()
        self.assertEqual(created2, {"service": 0, "water": 0, "suggestion": 0})

    def test_public_legacy_endpoints_mirror_into_submissions(self):
        ensure_system_forms()
        res = self.client.post("/api/public-suggestions/", {
            "title": "فكرة", "description": "تفاصيل", "submitted_by": "زائر",
        }, format="json")
        self.assertEqual(res.status_code, 201)
        self.assertTrue(
            RequestSubmission.objects.filter(form__slug=SLUG_SUGGESTION, data__title="فكرة").exists()
        )

    def test_public_forms_list_has_no_submission_pii(self):
        ensure_system_forms()
        form = RequestForm.objects.get(slug=SLUG_WATER)
        RequestSubmission.objects.create(
            form=form,
            data={"applicant_name": "سرّي", "mobile_number": "0500000000"},
        )
        res = self.client.get("/api/public-forms/")
        self.assertEqual(res.status_code, 200)
        blob = str(res.json())
        self.assertNotIn("سرّي", blob)
        self.assertNotIn("0500000000", blob)
        for row in res.json():
            self.assertNotIn("submissions", row)
            self.assertIn("slug", row)

    def test_reverse_removes_only_system_forms(self):
        ensure_system_forms()
        RequestForm.objects.create(title="مخصّص", slug="custom-x", fields_schema=[], is_active=True)
        reverse_system_forms_and_mirrored()
        self.assertFalse(RequestForm.objects.filter(slug__in=SYSTEM_SLUGS).exists())
        self.assertTrue(RequestForm.objects.filter(slug="custom-x").exists())

    def test_admin_can_crud_and_bind_project(self):
        self.client.force_authenticate(self.admin)
        p = Project.objects.get(slug="saqya")
        res = self.client.post("/api/admin/request-forms/", {
            "title": "نموذج جديد", "slug": "new-dyn", "project": p.id,
            "fields_schema": [{"key": "n", "label": "اسم", "type": "text", "required": True}],
            "is_active": True,
        }, format="json")
        self.assertEqual(res.status_code, 201, res.data)
        self.assertEqual(res.data["project"], p.id)
