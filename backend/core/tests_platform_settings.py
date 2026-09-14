from django.contrib.auth.models import User
from rest_framework.test import APITestCase

from core.models import PlatformSetting, StaticPage
from core.platform_settings import PUBLIC_SETTING_KEYS, public_payload


def make_user(email, role):
    u = User.objects.create_user(username=email, email=email, password="Hello12345!")
    u.profile.role = role
    u.profile.save()
    return u


class PlatformSettingsTests(APITestCase):
    def setUp(self):
        self.admin = make_user("adm@x.com", "admin")
        self.vol = make_user("vol@x.com", "user")
        PlatformSetting.load()

    def test_singleton_enforced(self):
        a = PlatformSetting.load()
        b = PlatformSetting(platform_name="أخرى")
        b.save()
        self.assertEqual(PlatformSetting.objects.count(), 1)
        self.assertEqual(PlatformSetting.objects.get().pk, 1)
        self.assertEqual(a.pk, b.pk)

    def test_public_subset_only_safe_fields(self):
        res = self.client.get("/api/public-settings/")
        self.assertEqual(res.status_code, 200)
        allowed = set(PUBLIC_SETTING_KEYS) | {"pages"}
        self.assertEqual(set(res.data.keys()), allowed)
        self.assertNotIn("id", res.data)
        self.assertNotIn("updated_at", res.data)
        self.assertNotIn("SECRET_KEY", str(res.data))
        for page in res.data["pages"]:
            self.assertEqual(set(page.keys()), {"slug", "title", "body"})
            self.assertNotIn("is_published", page)

    def test_unpublished_page_not_in_public(self):
        StaticPage.objects.update_or_create(
            slug="terms",
            defaults={"title": "الشروط", "body": "سري", "is_published": False},
        )
        payload = public_payload()
        slugs = [p["slug"] for p in payload["pages"]]
        self.assertNotIn("terms", slugs)

    def test_publish_static_page_appears_public(self):
        self.client.force_authenticate(self.admin)
        res = self.client.patch(
            "/api/static-pages/terms/",
            {"is_published": True, "title": "الشروط", "body": "نص عام"},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        slugs = [p["slug"] for p in public_payload()["pages"]]
        self.assertIn("terms", slugs)

    def test_admin_patch_and_non_admin_403(self):
        self.client.force_authenticate(self.admin)
        res = self.client.patch(
            "/api/settings/",
            {"platform_name": "منصة الاختبار", "show_map": False, "contact_email": "ops@takaful.com"},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["platform_name"], "منصة الاختبار")
        self.assertFalse(res.data["show_map"])
        self.client.force_authenticate(self.vol)
        res = self.client.patch("/api/settings/", {"platform_name": "هجوم"}, format="json")
        self.assertEqual(res.status_code, 403)
        res = self.client.get("/api/settings/")
        self.assertEqual(res.status_code, 403)

    def test_rejects_http_logo_and_bad_email(self):
        self.client.force_authenticate(self.admin)
        res = self.client.patch("/api/settings/", {"logo_url": "http://evil.example/x.png"}, format="json")
        self.assertEqual(res.status_code, 400)
        res = self.client.patch("/api/settings/", {"contact_email": "not-an-email"}, format="json")
        self.assertEqual(res.status_code, 400)
        res = self.client.patch(
            "/api/settings/",
            {"social_links": {"twitter": "http://twitter.com/x"}},
            format="json",
        )
        self.assertEqual(res.status_code, 400)
