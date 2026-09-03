"""اختبارات إعدادات الأدوات: التحقق، الظهور/الإخفاء، ربط الخدمات، سياق التبرع."""
from django.contrib.auth.models import User
from django.core.cache import cache
from rest_framework.test import APITestCase

from .models import Project, ProjectTool
from .tool_config import TOOL_CONFIG_SCHEMA, validate_tool_config
from rest_framework.exceptions import ValidationError


def make_user(username, role="user"):
    u = User.objects.create_user(username=username, email=f"{username}@t.local", password="pass12345")
    u.profile.role = role
    u.profile.save()
    return u


class ToolConfigValidationUnitTests(APITestCase):
    def test_schema_covers_all_tool_choices(self):
        self.assertEqual(set(TOOL_CONFIG_SCHEMA), set(dict(ProjectTool.TOOL_CHOICES)))

    def test_valid_configs(self):
        self.assertEqual(validate_tool_config("map", {"default_center": [24.7, 46.6], "default_zoom": 10}),
                         {"default_center": [24.7, 46.6], "default_zoom": 10})
        self.assertEqual(validate_tool_config("sponsorships", {"show_target_amount": True, "target_amount": 500}),
                         {"show_target_amount": True, "target_amount": 500})
        self.assertEqual(validate_tool_config("services", {"request_form": "water_supply"}),
                         {"request_form": "water_supply"})
        self.assertEqual(validate_tool_config("map", {}), {})
        self.assertEqual(validate_tool_config("map", None), {})

    def test_unknown_key_rejected(self):
        with self.assertRaises(ValidationError):
            validate_tool_config("map", {"zoom": 3})

    def test_type_and_range_checks(self):
        for tool, cfg in [
            ("map", {"default_zoom": 99}),
            ("map", {"default_center": [200, 0]}),
            ("sponsorships", {"target_amount": -1}),
            ("sponsorships", {"show_target_amount": "yes"}),
            ("services", {"request_form": "unknown"}),
            ("reports", {"public": 1}),
        ]:
            with self.assertRaises(ValidationError, msg=f"{tool}:{cfg}"):
                validate_tool_config(tool, cfg)


class SetToolConfigApiTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.admin = make_user("boss", role="admin")
        self.project = Project.objects.create(name="أداة", slug="tool-p", status="active")
        self.client.force_authenticate(self.admin)

    def _set(self, tool_key, config, enable=True):
        return self.client.post(
            f"/api/platform/projects/{self.project.id}/set_tool/",
            {"tool_key": tool_key, "is_enabled": enable, "config": config},
            format="json",
        )

    def test_valid_config_saved(self):
        res = self._set("map", {"default_center": [24.7, 46.6], "default_zoom": 8})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["config"]["default_zoom"], 8)

    def test_invalid_config_400(self):
        res = self._set("map", {"default_zoom": 50})
        self.assertEqual(res.status_code, 400)
        self.assertFalse(ProjectTool.objects.filter(project=self.project, tool_key="map").exists())

    def test_unknown_key_400(self):
        res = self._set("sponsorships", {"bogus": 1})
        self.assertEqual(res.status_code, 400)


class ToolVisibilityTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.project = Project.objects.create(name="ظاهر", slug="vis-p", status="active", is_active=True)

    def _enable(self, tool_key, config=None):
        ProjectTool.objects.update_or_create(
            project=self.project, tool_key=tool_key,
            defaults={"is_enabled": True, "config": config or {}},
        )

    def test_public_detail_lists_enabled_tools_and_config(self):
        self._enable("sponsorships", {"show_target_amount": True})
        self._enable("services", {"request_form": "water_supply"})
        res = self.client.get("/api/platform/public/projects/vis-p/")
        self.assertEqual(res.status_code, 200)
        self.assertCountEqual(res.json()["tools"], ["sponsorships", "services"])
        self.assertEqual(res.json()["tool_config"]["services"]["request_form"], "water_supply")

    def test_disabling_hides_tool(self):
        self._enable("sponsorships")
        ProjectTool.objects.filter(project=self.project, tool_key="sponsorships").update(is_enabled=False)
        res = self.client.get("/api/platform/public/projects/vis-p/")
        self.assertNotIn("sponsorships", res.json()["tools"])
        self.assertNotIn("sponsorships", res.json().get("tool_config", {}))


class SponsorshipToolConfigExtendedTests(APITestCase):
    def test_new_sponsorship_keys_accepted(self):
        from .tool_config import validate_tool_config, TOOL_CONFIG_SCHEMA, schema_payload
        cfg = {
            "show_target_amount": True,
            "target_amount": 10,
            "show_description": False,
            "show_location": True,
            "show_public_type_fields": True,
            "show_donation_cta": False,
        }
        self.assertEqual(validate_tool_config("sponsorships", cfg), cfg)
        for k in cfg:
            self.assertIn(k, TOOL_CONFIG_SCHEMA["sponsorships"])
            self.assertIn(k, schema_payload()["sponsorships"])
