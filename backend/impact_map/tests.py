import json
from copy import deepcopy

from django.contrib.auth.models import User
from django.core.cache import cache
from django.core.management import call_command
from django.test import override_settings
from rest_framework.settings import api_settings
from rest_framework.test import APITestCase

from impact_map.models import Region, Product, Contribution, DistributionRecord
from impact_map.serializers import mask_families_count


class MaskFamiliesTests(APITestCase):
    def test_under_five_returns_string(self):
        self.assertEqual(mask_families_count(0), "<5")
        self.assertEqual(mask_families_count(4), "<5")

    def test_five_or_more_returns_int(self):
        self.assertEqual(mask_families_count(5), 5)
        self.assertEqual(mask_families_count(100), 100)


class PublicPrivacyTests(APITestCase):
    def setUp(self):
        call_command("seed_impact_map")
        Contribution.objects.create(
            name="سري", phone="512345678", region=Region.objects.first(),
            product=Product.objects.first(), quantity=1,
            mode="self_distribution", status="pending",
        )

    def test_regions_no_pii_fields(self):
        res = self.client.get("/api/map/regions/")
        self.assertEqual(res.status_code, 200)
        forbidden = {"phone", "note", "user"}
        for row in res.data:
            self.assertNotIn("contributions", row)
            for key in forbidden:
                self.assertNotIn(key, row)

    def test_regions_mask_small_families(self):
        res = self.client.get("/api/map/regions/")
        rawdah = next(r for r in res.data if r["slug"] == "ar-rawdah")
        self.assertEqual(rawdah["families_served"], "<5")

    def test_summary_no_contribution_pii(self):
        res = self.client.get("/api/map/summary/")
        self.assertEqual(res.status_code, 200)
        body = json.dumps(res.data)
        self.assertNotIn("512345678", body)
        self.assertNotIn("سري", body)

    def test_products_outlets_no_pii(self):
        for path in ("/api/map/products/", "/api/map/outlets/"):
            res = self.client.get(path)
            self.assertEqual(res.status_code, 200)
            body = json.dumps(res.data)
            self.assertNotIn("512345678", body)
            self.assertNotIn("phone", body)


class PublicCacheTests(APITestCase):
    def test_public_get_has_cache_header(self):
        call_command("seed_impact_map")
        res = self.client.get("/api/map/summary/")
        self.assertEqual(res.status_code, 200)
        self.assertIn("max-age=60", res.get("Cache-Control", ""))


class AdminPermissionTests(APITestCase):
    def setUp(self):
        call_command("seed_impact_map")
        self.admin = User.objects.create_user(username="a@x.com", email="a@x.com", password="Hello12345!")
        self.admin.profile.role = "admin"
        self.admin.profile.save()
        self.user = User.objects.create_user(username="u@x.com", email="u@x.com", password="Hello12345!")
        self.user.profile.role = "user"
        self.user.profile.save()

    def test_anonymous_cannot_admin_list(self):
        res = self.client.get("/api/map/admin/regions/")
        self.assertIn(res.status_code, (401, 403))

    def test_non_admin_cannot_admin_list(self):
        self.client.force_authenticate(self.user)
        res = self.client.get("/api/map/admin/regions/")
        self.assertEqual(res.status_code, 403)

    def test_admin_can_crud_region(self):
        self.client.force_authenticate(self.admin)
        res = self.client.post("/api/map/admin/regions/", {
            "name": "اختبار", "slug": "test-region", "center_lat": 24.7,
            "center_lng": 46.7, "priority": "low", "is_active": True, "order": 99,
        }, format="json")
        self.assertEqual(res.status_code, 201)


class ContributionValidationTests(APITestCase):
    def setUp(self):
        call_command("seed_impact_map")
        self.region = Region.objects.get(slug="al-nakheel")
        self.product = Product.objects.get(slug="winter-bag")

    def _payload(self, **overrides):
        base = {
            "name": "متبرع", "phone": "0512345678", "region": self.region.slug,
            "product": self.product.slug, "quantity": 5, "mode": "self_distribution",
        }
        base.update(overrides)
        return base

    def test_valid_contribution(self):
        res = self.client.post("/api/map/contributions/", self._payload(), format="json")
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data["status"], "pending")

    def test_invalid_phone(self):
        res = self.client.post("/api/map/contributions/", self._payload(phone="123"), format="json")
        self.assertEqual(res.status_code, 400)

    def test_invalid_quantity(self):
        res = self.client.post("/api/map/contributions/", self._payload(quantity=0), format="json")
        self.assertEqual(res.status_code, 400)
        res = self.client.post("/api/map/contributions/", self._payload(quantity=1001), format="json")
        self.assertEqual(res.status_code, 400)

    def test_authenticated_user_attached(self):
        user = User.objects.create_user(username="d@x.com", email="d@x.com", password="Hello12345!")
        self.client.force_authenticate(user)
        res = self.client.post("/api/map/contributions/", self._payload(), format="json")
        self.assertEqual(res.status_code, 201)
        c = Contribution.objects.get(id=res.data["id"])
        self.assertEqual(c.user_id, user.id)


@override_settings(
    CACHES={"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}},
)
class ContributionThrottleTests(APITestCase):
    def setUp(self):
        call_command("seed_impact_map")
        cache.clear()
        from django.conf import settings
        rf = deepcopy(settings.REST_FRAMEWORK)
        rates = dict(rf.get("DEFAULT_THROTTLE_RATES", {}))
        rates["public_write"] = "2/min"
        rf["DEFAULT_THROTTLE_RATES"] = rates
        self._override = override_settings(REST_FRAMEWORK=rf)
        self._override.enable()
        api_settings.reload()
        self.addCleanup(self._override.disable)
        self.addCleanup(api_settings.reload)
        self.region = Region.objects.get(slug="al-nakheel")
        self.product = Product.objects.get(slug="winter-bag")

    def test_throttle_on_contributions(self):
        payload = {
            "name": "x", "phone": "0512345678", "region": self.region.slug,
            "product": self.product.slug, "quantity": 1, "mode": "self_distribution",
        }
        for _ in range(2):
            self.client.post("/api/map/contributions/", payload, format="json")
        res = self.client.post("/api/map/contributions/", payload, format="json")
        self.assertEqual(res.status_code, 429)


class ContributionStatusActionTests(APITestCase):
    def setUp(self):
        call_command("seed_impact_map")
        self.admin = User.objects.create_user(username="a@x.com", email="a@x.com", password="Hello12345!")
        self.admin.profile.role = "admin"
        self.admin.profile.save()
        self.contrib = Contribution.objects.create(
            name="ت", phone="512345678", region=Region.objects.first(),
            product=Product.objects.first(), quantity=1,
            mode="self_distribution", status="pending",
        )

    def test_admin_approve_fulfill_cancel(self):
        self.client.force_authenticate(self.admin)
        for action, expected in (("approve", "approved"), ("fulfill", "fulfilled"), ("cancel", "cancelled")):
            self.contrib.status = "pending"
            self.contrib.save()
            res = self.client.post(f"/api/map/admin/contributions/{self.contrib.id}/{action}/")
            self.assertEqual(res.status_code, 200)
            self.contrib.refresh_from_db()
            self.assertEqual(self.contrib.status, expected)


class SeedIdempotencyTests(APITestCase):
    def test_seed_runs_twice_without_duplicates(self):
        call_command("seed_impact_map")
        n1 = Region.objects.count()
        call_command("seed_impact_map")
        n2 = Region.objects.count()
        self.assertEqual(n1, n2)
        self.assertEqual(n1, 12)
        self.assertEqual(Product.objects.count(), 4)
        self.assertEqual(DistributionRecord.objects.count(), 12)
