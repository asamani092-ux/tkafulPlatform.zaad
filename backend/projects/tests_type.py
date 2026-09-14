"""اختبارات نوع المشروع: CRUD، بذرة idempotent، مشروع مع/بدون نوع."""
import importlib

from django.apps import apps as django_apps
from django.contrib.auth.models import User
from django.core.cache import cache
from rest_framework.test import APITestCase

from .models import Project, ProjectType

_seed_mod = importlib.import_module("projects.migrations.0005_project_type")


def make_user(username, role="user"):
    u = User.objects.create_user(username=username, email=f"{username}@t.local", password="pass12345")
    u.profile.role = role
    u.profile.save()
    return u


class ProjectTypeSeedTests(APITestCase):
    def test_starter_types_seeded(self):
        slugs = set(ProjectType.objects.values_list("slug", flat=True))
        self.assertTrue({"ighathi", "mawsimi", "kafalat", "tatawwui", "tawawi"} <= slugs)

    def test_seed_is_idempotent(self):
        before = ProjectType.objects.count()
        _seed_mod.seed_types(django_apps, None)
        _seed_mod.seed_types(django_apps, None)
        self.assertEqual(ProjectType.objects.count(), before)

    def test_public_types_endpoint_active_only(self):
        ProjectType.objects.create(name="مخفي", slug="hidden", is_active=False, order=99)
        res = self.client.get("/api/platform/public/project-types/")
        self.assertEqual(res.status_code, 200)
        slugs = {t["slug"] for t in res.json()}
        self.assertIn("ighathi", slugs)
        self.assertNotIn("hidden", slugs)


class ProjectTypeCrudTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.admin = make_user("boss", role="admin")
        self.user = make_user("vol", role="user")

    def test_crud_admin_only(self):
        self.client.force_authenticate(self.user)
        self.assertEqual(self.client.get("/api/platform/project-types/").status_code, 403)
        self.assertEqual(
            self.client.post("/api/platform/project-types/", {"name": "جديد", "slug": "new-t"}, format="json").status_code,
            403,
        )

        self.client.force_authenticate(self.admin)
        created = self.client.post(
            "/api/platform/project-types/", {"name": "طارئ", "slug": "emergency", "order": 10}, format="json"
        )
        self.assertEqual(created.status_code, 201)
        tid = created.data["id"]
        patched = self.client.patch(f"/api/platform/project-types/{tid}/", {"is_active": False}, format="json")
        self.assertEqual(patched.status_code, 200)
        self.assertFalse(patched.data["is_active"])
        self.assertEqual(self.client.delete(f"/api/platform/project-types/{tid}/").status_code, 204)

    def test_project_with_and_without_type(self):
        t = ProjectType.objects.get(slug="kafalat")
        self.client.force_authenticate(self.admin)
        with_type = self.client.post(
            "/api/platform/projects/", {"name": "أ", "slug": "with-t", "type": t.id}, format="json"
        )
        self.assertEqual(with_type.status_code, 201)
        self.assertEqual(with_type.data["type"], t.id)
        self.assertEqual(with_type.data["type_slug"], "kafalat")

        without = self.client.post("/api/platform/projects/", {"name": "ب", "slug": "no-t"}, format="json")
        self.assertEqual(without.status_code, 201)
        self.assertIsNone(without.data["type"])
        self.assertIsNone(without.data["type_name"])

    def test_public_project_exposes_type(self):
        t = ProjectType.objects.get(slug="mawsimi")
        Project.objects.create(name="عام", slug="pub-t", status="active", is_active=True, type=t)
        res = self.client.get("/api/platform/public/projects/")
        self.assertEqual(res.status_code, 200)
        row = next(p for p in res.json() if p["slug"] == "pub-t")
        self.assertEqual(row["type_slug"], "mawsimi")
        self.assertEqual(row["type_name"], "موسمي")
