"""
اختبارات أمر سلامة الهجرة check_migration_integrity والتوافق الخلفي للمسارات القديمة.
"""
import json
import tempfile

from django.contrib.auth.models import User
from django.core.management import CommandError, call_command
from django.utils import timezone
from rest_framework.test import APITestCase

from maps.constants import MAP_TITLE, PROJECT_SLUG
from maps.models import Map, MapContribution, MapDistributionRecord, MapItem, MapItemField, MapLayer, MapProduct
from projects.models import Project


def build_migrated_state():
    """يحاكي حالة ما بعد Phase A1: مشاريع أساسية + خريطة «تفقدهم» ببيانات maps."""
    for slug, name in [("saqya", "كفالات السقيا"), ("tafaqqadhum", "تفقدهم"),
                       ("takaful-athar", "تكافل وأثر")]:
        Project.objects.get_or_create(slug=slug, defaults={"name": name})

    tafaqqadhum = Project.objects.get(slug="tafaqqadhum")
    Map.objects.filter(project=tafaqqadhum, title=MAP_TITLE).delete()
    map_obj = Map.objects.create(
        project=tafaqqadhum, title=MAP_TITLE,
        visibility="mixed", published_at=timezone.now(),
    )
    layer = MapLayer.objects.create(map=map_obj, name="المناطق", visibility="public")
    MapItemField.objects.create(map=map_obj, key="kind", label="النوع", type="select",
                                options=["region", "outlet"])
    region_item = MapItem.objects.create(
        map=map_obj, layer=layer, lat=24.7, lng=46.6, name="منطقة",
        data={"kind": "region", "slug": "r1"},
    )
    product = MapProduct.objects.create(map=map_obj, name="منتج", slug="p1")
    MapContribution.objects.create(
        map=map_obj, item=region_item, category=product.slug,
        name="مساهم", phone="512345678", mode="self_distribution", quantity=3,
    )
    MapDistributionRecord.objects.create(
        map=map_obj, region_item=region_item, product=product,
        families_served=10, quantity_distributed=10, date=timezone.now().date(),
    )
    return map_obj


class MigrationIntegrityCommandTests(APITestCase):
    def test_snapshot_then_verify_passes(self):
        build_migrated_state()
        with tempfile.NamedTemporaryFile(suffix=".json", mode="w", delete=False) as f:
            path = f.name
        call_command("check_migration_integrity", snapshot=path)
        with open(path) as f:
            snap = json.load(f)
        self.assertEqual(snap["maps.region_items"], 1)
        call_command("check_migration_integrity", verify=path, expect="migrated")

    def test_verify_fails_on_source_count_change(self):
        build_migrated_state()
        with tempfile.NamedTemporaryFile(suffix=".json", mode="w", delete=False) as f:
            path = f.name
        call_command("check_migration_integrity", snapshot=path)
        MapProduct.objects.all().delete()
        with self.assertRaises(CommandError):
            call_command("check_migration_integrity", verify=path, expect="migrated")

    def test_verify_fails_on_copy_mismatch(self):
        map_obj = build_migrated_state()
        with tempfile.NamedTemporaryFile(suffix=".json", mode="w", delete=False) as f:
            path = f.name
        call_command("check_migration_integrity", snapshot=path)
        MapContribution.objects.filter(map=map_obj).delete()
        with self.assertRaises(CommandError):
            call_command("check_migration_integrity", verify=path, expect="migrated")

    def test_expect_reverted_fails_if_copy_still_exists(self):
        build_migrated_state()
        with self.assertRaises(CommandError):
            call_command("check_migration_integrity", expect="reverted")


class PostMigrateSeedTests(APITestCase):
    """سيناريو المطوّر: migrate ثم seed_impact_map — يكتب مباشرة إلى maps."""

    def test_migrate_then_seed_passes_integrity(self):
        call_command("seed_impact_map")
        call_command("check_migration_integrity", expect="migrated")

    def test_seed_is_idempotent(self):
        call_command("seed_impact_map")
        tafaqqadhum = Project.objects.get(slug=PROJECT_SLUG)
        map_obj = Map.objects.get(project=tafaqqadhum, title=MAP_TITLE)
        items_before = MapItem.objects.filter(map=map_obj).count()

        call_command("seed_impact_map")
        self.assertEqual(MapItem.objects.filter(map=map_obj).count(), items_before)
        call_command("check_migration_integrity", expect="migrated")

    def test_direct_public_contributions_do_not_break_integrity(self):
        call_command("seed_impact_map")
        tafaqqadhum = Project.objects.get(slug=PROJECT_SLUG)
        map_obj = Map.objects.get(project=tafaqqadhum, title=MAP_TITLE)
        MapContribution.objects.create(
            map=map_obj, name="زائر", phone="512345678",
            mode="self_distribution", quantity=1,
        )
        call_command("check_migration_integrity", expect="migrated")


class LegacyUrlCompatibilityTests(APITestCase):
    """التوافق الخلفي: المسارات القديمة تبقى تعمل بعد النقل (D-05)."""

    def setUp(self):
        self.admin = User.objects.create_user(username="boss", email="boss@t.local", password="x12345678")
        self.admin.profile.role = "admin"
        self.admin.profile.save()

    def test_legacy_saqya_routes_still_resolve(self):
        self.client.force_authenticate(self.admin)
        res = self.client.get("/api/saqya/sponsorships/")
        self.assertEqual(res.status_code, 200)
        res = self.client.get("/api/saqya/dashboard/")
        self.assertEqual(res.status_code, 200)

    def test_new_sponsorships_mount_serves_same_api(self):
        self.client.force_authenticate(self.admin)
        res = self.client.get("/api/sponsorships/sponsorships/")
        self.assertEqual(res.status_code, 200)

    def test_legacy_volunteering_routes_still_resolve(self):
        self.client.force_authenticate(self.admin)
        res = self.client.get("/api/projects/")
        self.assertEqual(res.status_code, 200)
        res = self.client.get("/api/stats/")
        self.assertEqual(res.status_code, 200)

    def test_legacy_impact_map_routes_still_resolve(self):
        res = self.client.get("/api/map/summary/")
        self.assertEqual(res.status_code, 200)

    def test_jwt_auth_unchanged(self):
        res = self.client.post(
            "/api/accounts/auth/token/",
            {"username": "boss@t.local", "password": "x12345678"},
        )
        self.assertEqual(res.status_code, 200)
        self.assertIn("access", res.json())
