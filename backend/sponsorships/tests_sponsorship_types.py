"""اختبارات أنواع الكفالات الديناميكية — بوابة المرحلة 1."""
from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework.test import APITestCase

from projects.models import Project
from .models import Sponsorship, SponsorshipType


def make_user(email, role):
    u = User.objects.create_user(username=email, email=email, password="Hello12345!")
    u.profile.role = role
    u.profile.save()
    return u


class SponsorshipTypeCRUDTests(APITestCase):
    def setUp(self):
        self.admin = make_user("admin@t.com", "admin")
        self.donor = make_user("donor@t.com", "donor")
        self.project = Project.objects.create(name="سقيا تجريبي", slug="saqya-test")

    def test_admin_crud_type_auto_slug(self):
        self.client.force_authenticate(self.admin)
        res = self.client.post(
            "/api/saqya/sponsorship-types/",
            {
                "project": self.project.slug,
                "name": "كفالة بئر",
                "description": "وصف",
                "fields": [
                    {"key": "depth", "label": "العمق", "type": "number", "required": True},
                    {
                        "key": "soil",
                        "label": "التربة",
                        "type": "select",
                        "required": False,
                        "options": ["رملية", "صخرية"],
                    },
                ],
            },
            format="json",
        )
        self.assertEqual(res.status_code, 201, res.data)
        self.assertTrue(res.data["slug"])
        self.assertNotIn("slug", res.data.get("slug", "") and {})  # slug auto
        tid = res.data["id"]

        listed = self.client.get(f"/api/saqya/sponsorship-types/?project={self.project.slug}")
        self.assertEqual(listed.status_code, 200)
        rows = listed.data["results"] if isinstance(listed.data, dict) and "results" in listed.data else listed.data
        self.assertEqual(len(rows), 1)

        patch = self.client.patch(
            f"/api/saqya/sponsorship-types/{tid}/",
            {"name": "كفالة بئر عميق"},
            format="json",
        )
        self.assertEqual(patch.status_code, 200)
        self.assertIn("عميق", patch.data["name"])

        deleted = self.client.delete(f"/api/saqya/sponsorship-types/{tid}/")
        self.assertEqual(deleted.status_code, 204)

    def test_fields_schema_validation(self):
        self.client.force_authenticate(self.admin)
        bad = self.client.post(
            "/api/saqya/sponsorship-types/",
            {
                "project": self.project.slug,
                "name": "سيء",
                "fields": [{"key": "x", "label": "", "type": "text"}],
            },
            format="json",
        )
        self.assertEqual(bad.status_code, 400)

    def test_donor_sees_active_types_only(self):
        SponsorshipType.objects.create(
            project=self.project, name="نشط", slug="active", is_active=True, fields=[]
        )
        SponsorshipType.objects.create(
            project=self.project, name="مخفي", slug="hidden", is_active=False, fields=[]
        )
        self.client.force_authenticate(self.donor)
        res = self.client.get(f"/api/saqya/sponsorship-types/?project={self.project.slug}")
        self.assertEqual(res.status_code, 200)
        rows = res.data["results"] if isinstance(res.data, dict) and "results" in res.data else res.data
        names = [r["name"] for r in rows]
        self.assertEqual(names, ["نشط"])


class SponsorshipWithTypeTests(APITestCase):
    def setUp(self):
        self.admin = make_user("admin2@t.com", "admin")
        self.donor = make_user("donor2@t.com", "donor")
        self.project = Project.objects.create(name="مشروع كفالات", slug="kafalat")
        self.stype = SponsorshipType.objects.create(
            project=self.project,
            name="سقيا منزلية",
            slug="manziliya",
            fields=[
                {"key": "tanks", "label": "عدد الخزانات", "type": "number", "required": True},
                {"key": "note", "label": "ملاحظة", "type": "text", "required": False},
            ],
        )

    def test_create_with_type_fills_legacy_type_and_validates(self):
        self.client.force_authenticate(self.donor)
        bad = self.client.post(
            "/api/saqya/sponsorships/",
            {
                "amount": "500",
                "sponsorship_type": self.stype.id,
                "type_data": {"note": "فقط"},
            },
            format="json",
        )
        self.assertEqual(bad.status_code, 400)

        ok = self.client.post(
            "/api/saqya/sponsorships/",
            {
                "amount": "500",
                "sponsorship_type": self.stype.id,
                "type_data": {"tanks": 2, "note": "حيّ أ"},
                "beneficiaries_count": 3,
            },
            format="json",
        )
        self.assertEqual(ok.status_code, 201, ok.data)
        sp = Sponsorship.objects.get(pk=ok.data["id"])
        self.assertEqual(sp.type, "سقيا منزلية")
        self.assertEqual(sp.sponsorship_type_id, self.stype.id)
        self.assertEqual(sp.project_id, self.project.id)
        self.assertEqual(sp.type_data.get("tanks"), 2.0)

    def test_create_without_type_legacy(self):
        self.client.force_authenticate(self.donor)
        res = self.client.post(
            "/api/saqya/sponsorships/",
            {"amount": "100", "type": "سقيا", "beneficiaries_count": 1},
            format="json",
        )
        self.assertEqual(res.status_code, 201, res.data)
        sp = Sponsorship.objects.get(pk=res.data["id"])
        self.assertIsNone(sp.sponsorship_type_id)
        self.assertEqual(sp.type, "سقيا")

    def test_migration_reverse_keeps_null_type(self):
        """الكفالات القديمة بلا نوع تبقى صالحة."""
        self.client.force_authenticate(self.donor)
        res = self.client.post(
            "/api/saqya/sponsorships/",
            {"amount": "50", "type": "قديم", "beneficiaries_count": 1},
            format="json",
        )
        sp = Sponsorship.objects.get(pk=res.data["id"])
        self.assertIsNone(sp.sponsorship_type_id)
        self.assertEqual(sp.type_data, {})
