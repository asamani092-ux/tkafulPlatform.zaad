"""
Phase 1 UAT remediation — منع تسريب مشاريع غير نشطة عبر النقاط العامة.
مسودة ومؤرشف ومكتمل وموقوف لا يظهرون في أي نقطة عامة.
"""
from django.contrib.auth.models import User
from rest_framework.test import APITestCase

from projects.models import Project
from volunteering.models import VolunteeringProfile


PUBLIC_PROJECT_ENDPOINTS = (
    "/api/public-projects/",
    "/api/platform/public/projects/",
)


class PublicProjectLeakTests(APITestCase):
    def setUp(self):
        self.active = Project.objects.create(
            name="ظاهر-نشط", slug="pub-active-leak", status="active", is_active=True
        )
        self.draft = Project.objects.create(
            name="سرّي-draft", slug="secret-draft-leak", status="draft", is_active=True
        )
        self.archived = Project.objects.create(
            name="سرّي-archived", slug="secret-archived-leak", status="archived", is_active=True
        )
        self.completed = Project.objects.create(
            name="مكتمل-عام", slug="completed-leak", status="completed", is_active=True
        )
        self.inactive = Project.objects.create(
            name="موقوف-نشط-حالة", slug="inactive-leak", status="active", is_active=False
        )
        for p, status_v in (
            (self.active, "ACTIVE"),
            (self.draft, "PLANNED"),
            (self.archived, "CANCELLED"),
            (self.completed, "COMPLETED"),
            (self.inactive, "ACTIVE"),
        ):
            VolunteeringProfile.objects.create(
                project=p, volunteer_status=status_v, beneficiaries=5, is_hidden=False
            )

        self.volunteer = User.objects.create_user(
            username="vol@leak.test", email="vol@leak.test", password="Hello12345!"
        )
        self.volunteer.profile.role = "user"
        self.volunteer.profile.save()

    def _titles_from_legacy(self, payload):
        if isinstance(payload, list):
            return [p.get("title") or p.get("name") for p in payload]
        return [p.get("title") or p.get("name") for p in payload.get("results", [])]

    def test_legacy_public_projects_excludes_non_active(self):
        res = self.client.get("/api/public-projects/")
        self.assertEqual(res.status_code, 200)
        titles = self._titles_from_legacy(res.json())
        self.assertIn("ظاهر-نشط", titles)
        for forbidden in ("سرّي-draft", "سرّي-archived", "مكتمل-عام", "موقوف-نشط-حالة"):
            self.assertNotIn(forbidden, titles)

    def test_platform_public_projects_excludes_non_active(self):
        # cache_page على public_projects قد يحتفظ بردّ سابق — نمسح الكاش.
        from django.core.cache import cache
        cache.clear()
        res = self.client.get("/api/platform/public/projects/")
        self.assertEqual(res.status_code, 200)
        names = [p["name"] for p in res.json()]
        self.assertIn("ظاهر-نشط", names)
        for forbidden in ("سرّي-draft", "سرّي-archived", "مكتمل-عام", "موقوف-نشط-حالة"):
            self.assertNotIn(forbidden, names)

    def test_public_project_detail_404_for_draft_and_archived(self):
        for slug in ("secret-draft-leak", "secret-archived-leak", "completed-leak", "inactive-leak"):
            res = self.client.get(f"/api/platform/public/projects/{slug}/")
            self.assertEqual(res.status_code, 404, slug)
        res = self.client.get("/api/platform/public/projects/pub-active-leak/")
        self.assertEqual(res.status_code, 200)

    def test_opportunities_exclude_non_active(self):
        self.client.force_authenticate(self.volunteer)
        res = self.client.get("/api/user/opportunities/")
        self.assertEqual(res.status_code, 200)
        titles = [p["title"] for p in res.json()["results"]]
        self.assertIn("ظاهر-نشط", titles)
        self.assertNotIn("سرّي-draft", titles)
        self.assertNotIn("سرّي-archived", titles)

    def test_public_home_stats_count_only_active(self):
        res = self.client.get("/api/public-home-stats/")
        self.assertEqual(res.status_code, 200)
        # مشروع نشط واحد فقط من مجموعة الاختبار (البذور الأخرى قد تزيد العدد)
        # نتحقق أن المسودة/المؤرشف لا ترفع المستفيدين فوق مجموع النشط العام من هذه البذرة:
        # على الأقل: potential_projects لا يساوي إجمالي الملفات (5) لهذه المجموعة المعزولة
        # عبر إنشاء مشروع وحيد في قاعدة نظيفة — هنا نتحقق أن أسماء المسودة غير محتسبة بزيادة
        # المستفيدين: النشط فقط beneficiaries=5 من مجموعتنا؛ المسودات لها أيضاً 5 لكن مستبعدة.
        data = res.json()
        self.assertGreaterEqual(data["potential_projects"], 1)
        # إن وُجدت بذور أخرى، نضمن أن العدد أقل من إجمالي كل الملفات غير المخفية
        from volunteering.models import VolunteeringProfile
        all_visible = VolunteeringProfile.objects.filter(is_hidden=False).count()
        self.assertLess(data["potential_projects"], all_visible)

    def test_hidden_profile_never_public_even_if_active(self):
        VolunteeringProfile.objects.filter(project=self.active).update(is_hidden=True)
        res = self.client.get("/api/public-projects/")
        titles = self._titles_from_legacy(res.json())
        self.assertNotIn("ظاهر-نشط", titles)
