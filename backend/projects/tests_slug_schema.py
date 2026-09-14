"""اختبارات توليد slug ومخطّط إعدادات الأدوات للواجهة."""
from django.contrib.auth.models import User
from rest_framework.test import APITestCase

from projects.models import Project, ProjectType
from projects.slug_utils import unique_slug_from_name
from projects.tool_config import TOOL_CONFIG_SCHEMA, schema_payload


def _admin():
    u = User.objects.create_user(username="adm", email="adm@t.local", password="pass12345")
    u.is_staff = True
    u.is_superuser = True
    u.save()
    # profile role إن وُجد
    profile = getattr(u, "profile", None)
    if profile is not None:
        profile.role = "admin"
        profile.save()
    return u


class SlugUtilsTests(APITestCase):
    def test_unique_slug_from_name(self):
        Project.objects.create(name="أ", slug="demo")
        s = unique_slug_from_name(Project, "demo")
        self.assertEqual(s, "demo-2")


class ProjectCreateAutoSlugTests(APITestCase):
    def setUp(self):
        self.user = _admin()
        self.client.force_authenticate(self.user)

    def test_create_without_slug(self):
        res = self.client.post(
            "/api/platform/projects/",
            {"name": "مشروع تجريبي", "description": "x"},
            format="json",
        )
        self.assertEqual(res.status_code, 201, res.content)
        self.assertTrue(res.data.get("slug"))
        self.assertTrue(Project.objects.filter(slug=res.data["slug"]).exists())

    def test_project_type_create_without_slug(self):
        res = self.client.post(
            "/api/platform/project-types/",
            {"name": "نوع جديد", "order": 1},
            format="json",
        )
        self.assertEqual(res.status_code, 201, res.content)
        self.assertTrue(res.data.get("slug"))
        self.assertTrue(ProjectType.objects.filter(slug=res.data["slug"]).exists())


class ToolConfigSchemaEndpointTests(APITestCase):
    def setUp(self):
        self.user = _admin()
        self.client.force_authenticate(self.user)

    def test_schema_matches_tool_config_schema(self):
        res = self.client.get("/api/platform/tool-config-schema/")
        self.assertEqual(res.status_code, 200)
        payload = res.data
        self.assertEqual(set(payload.keys()), set(TOOL_CONFIG_SCHEMA.keys()))
        for tool, fields in TOOL_CONFIG_SCHEMA.items():
            self.assertEqual(set(payload[tool].keys()), set(fields.keys()))
            for key, kind in fields.items():
                self.assertEqual(payload[tool][key]["type"], kind)
                self.assertIn("label", payload[tool][key])
                # التسمية يجب ألا تساوي المفتاح الإنجليزي وحده إن وُجدت واجهة
                self.assertTrue(payload[tool][key]["label"])

    def test_schema_payload_helper(self):
        p = schema_payload()
        self.assertIn("map", p)
        self.assertEqual(p["map"]["default_zoom"]["type"], "int")
