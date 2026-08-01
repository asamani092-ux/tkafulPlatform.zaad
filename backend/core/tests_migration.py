"""
اختبارات أمر سلامة الهجرة check_migration_integrity والتوافق الخلفي للمسارات القديمة.
"""
import json
import tempfile

from django.contrib.auth.models import User
from django.core.management import CommandError, call_command
from django.utils import timezone
from rest_framework.test import APITestCase

from impact_map.models import Contribution, Product, Region
from maps.models import Map, MapContribution, MapItem, MapItemField, MapLayer
from projects.models import Project


def build_migrated_state():
    """يحاكي حالة ما بعد الهجرة: مشاريع أساسية + خريطة «تفقدهم» منسوخة مطابقة."""
    for slug, name in [("saqya", "كفالات السقيا"), ("tafaqqadhum", "تفقدهم"),
                       ("takaful-athar", "تكافل وأثر")]:
        Project.objects.get_or_create(slug=slug, defaults={"name": name})

    region = Region.objects.create(name="منطقة", slug="r1", center_lat=24.7, center_lng=46.6)
    product = Product.objects.create(name="منتج", slug="p1")
    Contribution.objects.create(name="مساهم", phone="512345678", region=region,
                                product=product, quantity=3, mode="self_distribution")

    tafaqqadhum = Project.objects.get(slug="tafaqqadhum")
    # هجرة maps.0002 قد أنشأت خريطة فارغة أثناء بناء قاعدة الاختبار (لا بيانات مصدر
    # وقتها) — نزيلها لبناء حالة مطابقة حتمية
    Map.objects.filter(project=tafaqqadhum, title="خارطة تفقدهم").delete()
    map_obj = Map.objects.create(project=tafaqqadhum, title="خارطة تفقدهم",
                                 visibility="mixed", published_at=timezone.now())
    layer = MapLayer.objects.create(map=map_obj, name="المناطق", visibility="public")
    MapItemField.objects.create(map=map_obj, key="kind", label="النوع", type="select",
                                options=["region", "outlet"])
    MapItemField.objects.create(map=map_obj, key="product", label="المنتج", type="select",
                                options=[{"value": "p1", "label": "منتج"}])
    MapItem.objects.create(map=map_obj, layer=layer, lat=24.7, lng=46.6, name="منطقة",
                           data={"kind": "region"})
    source_contribution = Contribution.objects.first()
    MapContribution.objects.create(map=map_obj, name="مساهم", phone="512345678",
                                   mode="self_distribution", quantity=3,
                                   external_id=f"impact_map:{source_contribution.id}")
    return map_obj


class MigrationIntegrityCommandTests(APITestCase):
    def test_snapshot_then_verify_passes(self):
        build_migrated_state()
        with tempfile.NamedTemporaryFile(suffix=".json", mode="w", delete=False) as f:
            path = f.name
        call_command("check_migration_integrity", snapshot=path)
        with open(path) as f:
            snap = json.load(f)
        self.assertEqual(snap["impact_map.Region"], 1)
        call_command("check_migration_integrity", verify=path, expect="migrated")

    def test_verify_fails_on_source_count_change(self):
        build_migrated_state()
        with tempfile.NamedTemporaryFile(suffix=".json", mode="w", delete=False) as f:
            path = f.name
        call_command("check_migration_integrity", snapshot=path)
        # عبث: حذف صف مصدر بعد اللقطة يجب أن يُفشل التحقق (شرط الإيقاف الاضطراري)
        Contribution.objects.all().delete()
        with self.assertRaises(CommandError):
            call_command("check_migration_integrity", verify=path, expect="migrated")

    def test_verify_fails_on_copy_mismatch(self):
        map_obj = build_migrated_state()
        with tempfile.NamedTemporaryFile(suffix=".json", mode="w", delete=False) as f:
            path = f.name
        call_command("check_migration_integrity", snapshot=path)
        # عبث بالهدف: حذف مساهمة منسوخة يجب أن يكسر مطابقة المصدر/الهدف
        MapContribution.objects.filter(map=map_obj).delete()
        with self.assertRaises(CommandError):
            call_command("check_migration_integrity", verify=path, expect="migrated")

    def test_expect_reverted_fails_if_copy_still_exists(self):
        build_migrated_state()
        with self.assertRaises(CommandError):
            call_command("check_migration_integrity", expect="reverted")


class PostMigrateSeedSyncTests(APITestCase):
    """
    سيناريو المطوّر الافتراضي: migrate على قاعدة جديدة (مصدر impact_map فارغ
    لحظة تشغيل maps.0002) ثم seed_impact_map — يجب أن تمر فحوص السلامة
    بفضل المزامنة التلقائية sync_impact_map_to_maps.
    """

    def test_migrate_then_seed_passes_integrity(self):
        # قاعدة الاختبار مُهاجرة بالفعل والمصدر كان فارغاً أثناء maps.0002
        call_command("seed_impact_map")  # يستدعي sync_impact_map_to_maps تلقائياً
        call_command("check_migration_integrity", expect="migrated")

    def test_seed_and_sync_are_idempotent(self):
        call_command("seed_impact_map")
        tafaqqadhum = Project.objects.get(slug="tafaqqadhum")
        map_obj = Map.objects.get(project=tafaqqadhum, title="خارطة تفقدهم")
        items_before = MapItem.objects.filter(map=map_obj).count()

        # إعادة البذر + المزامنة لا تُكرّر شيئاً
        call_command("seed_impact_map")
        self.assertEqual(MapItem.objects.filter(map=map_obj).count(), items_before)
        call_command("check_migration_integrity", expect="migrated")

    def test_sync_copies_late_contributions_once(self):
        call_command("seed_impact_map")
        region = Region.objects.first()
        product = Product.objects.first()
        c = Contribution.objects.create(
            name="مساهم متأخر", phone="512345678", region=region, product=product,
            quantity=3, mode="self_distribution",
        )
        call_command("sync_impact_map_to_maps")
        call_command("sync_impact_map_to_maps")  # إعادة تشغيل آمنة
        copies = MapContribution.objects.filter(external_id=f"impact_map:{c.id}")
        self.assertEqual(copies.count(), 1)
        # الحفاظ على تاريخ الإنشاء الأصلي
        self.assertEqual(copies.first().created_at, c.created_at)
        call_command("check_migration_integrity", expect="migrated")

    def test_direct_public_contributions_do_not_break_integrity(self):
        call_command("seed_impact_map")
        tafaqqadhum = Project.objects.get(slug="tafaqqadhum")
        map_obj = Map.objects.get(project=tafaqqadhum, title="خارطة تفقدهم")
        # مساهمة عامة مباشرة على النظام الجديد (بدون وسم مصدر) — خارج مقارنة السلامة
        MapContribution.objects.create(map=map_obj, name="زائر", phone="512345678",
                                       mode="self_distribution", quantity=1)
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
        """لا تغيير في مسار المصادقة أو حسابات المستخدمين (متطلب صريح)."""
        res = self.client.post(
            "/api/accounts/auth/token/",
            {"username": "boss@t.local", "password": "x12345678"},
        )
        self.assertEqual(res.status_code, 200)
        self.assertIn("access", res.json())
