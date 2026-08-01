"""
اختبارات نظام الخرائط:
- الفلترة المركزية للظهور المختلط (طبقات خاصة + حقول غير عامة لا تتسرب أبداً).
- التحقق الديناميكي من الحقول ضد MapItemField.
- نطاق الأدمن عبر عضوية المشروع + provisioning للمشرف العام فقط.
- إخفاء PDPL (<5) في الملخص المجمّع.
"""
from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework.test import APITestCase

from projects.models import Project, ProjectMember

from .models import Map, MapContribution, MapItem, MapItemField, MapLayer
from .services import mask_small_count, validate_item_data


def make_user(username, role="user"):
    user = User.objects.create_user(username=username, email=f"{username}@t.local", password="pass12345")
    user.profile.role = role
    user.profile.save()
    return user


class MapFixtureMixin:
    def build_map(self, visibility="mixed", published=True):
        self.project = Project.objects.create(name="مشروع خريطة", slug="map-proj")
        self.map = Map.objects.create(
            project=self.project,
            title="خريطة اختبار",
            visibility=visibility,
            published_at=timezone.now() if published else None,
        )
        self.public_layer = MapLayer.objects.create(map=self.map, name="عام", visibility="public", order=0)
        self.private_layer = MapLayer.objects.create(map=self.map, name="خاص", visibility="private", order=1)
        MapItemField.objects.create(map=self.map, key="kind", label="النوع", type="select",
                                    options=["region", "outlet"], is_public=True, order=0)
        MapItemField.objects.create(map=self.map, key="capacity", label="السعة", type="number",
                                    is_public=True, order=1)
        MapItemField.objects.create(map=self.map, key="internal_note", label="ملاحظة داخلية",
                                    type="text", is_public=False, order=2)
        self.public_item = MapItem.objects.create(
            map=self.map, layer=self.public_layer, lat=24.7, lng=46.6, name="عنصر عام",
            data={"kind": "region", "capacity": 10, "internal_note": "سري"},
        )
        self.private_item = MapItem.objects.create(
            map=self.map, layer=self.private_layer, lat=24.8, lng=46.7, name="عنصر خاص",
            data={"kind": "outlet"},
        )


class MixedVisibilityFilteringTests(MapFixtureMixin, APITestCase):
    """حزمة الاختبار المخصصة للفلتر المركزي (المتطلب الإلزامي)."""

    def setUp(self):
        self.build_map()

    def test_public_detail_excludes_private_layers(self):
        res = self.client.get(f"/api/maps/public/{self.map.id}/")
        self.assertEqual(res.status_code, 200)
        payload = res.json()
        layer_ids = {l["id"] for l in payload["layers"]}
        self.assertIn(self.public_layer.id, layer_ids)
        self.assertNotIn(self.private_layer.id, layer_ids)
        item_names = {i["name"] for i in payload["items"]}
        self.assertIn("عنصر عام", item_names)
        self.assertNotIn("عنصر خاص", item_names)

    def test_public_detail_strips_non_public_fields(self):
        res = self.client.get(f"/api/maps/public/{self.map.id}/")
        payload = res.json()
        field_keys = {f["key"] for f in payload["fields"]}
        self.assertNotIn("internal_note", field_keys)
        for item in payload["items"]:
            self.assertNotIn("internal_note", item["data"])
        # الحقول العامة تبقى
        item = next(i for i in payload["items"] if i["name"] == "عنصر عام")
        self.assertEqual(item["data"]["capacity"], 10)

    def test_unpublished_map_not_public(self):
        self.map.published_at = None
        self.map.save(update_fields=["published_at"])
        res = self.client.get(f"/api/maps/public/{self.map.id}/")
        self.assertEqual(res.status_code, 404)

    def test_private_map_not_public(self):
        self.map.visibility = "private"
        self.map.save(update_fields=["visibility"])
        res = self.client.get(f"/api/maps/public/{self.map.id}/")
        self.assertEqual(res.status_code, 404)
        res = self.client.get("/api/maps/public/")
        self.assertEqual([m for m in res.json() if m["id"] == self.map.id], [])

    def test_aggregator_filters_by_project(self):
        other = Project.objects.create(name="آخر", slug="other-proj")
        other_map = Map.objects.create(project=other, title="خريطة أخرى", visibility="public",
                                       published_at=timezone.now())
        res = self.client.get("/api/maps/public/?project=map-proj")
        ids = {m["id"] for m in res.json()}
        self.assertIn(self.map.id, ids)
        self.assertNotIn(other_map.id, ids)

    def test_contribution_to_private_layer_item_rejected(self):
        res = self.client.post(
            f"/api/maps/public/{self.map.id}/contributions/",
            {"item": self.private_item.id, "name": "متبرع", "phone": "0512345678",
             "mode": "self_distribution", "quantity": 3},
        )
        self.assertEqual(res.status_code, 400)

    def test_public_contribution_created_pending(self):
        res = self.client.post(
            f"/api/maps/public/{self.map.id}/contributions/",
            {"item": self.public_item.id, "name": "متبرع", "phone": "0512345678",
             "mode": "self_distribution", "quantity": 3},
        )
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.json()["status"], "pending")

    def test_summary_masks_small_counts(self):
        MapContribution.objects.create(map=self.map, name="أ", phone="512345678",
                                       mode="self_distribution", quantity=2, status="fulfilled")
        res = self.client.get(f"/api/maps/public/{self.map.id}/summary/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["contributions_fulfilled"], "<5")

    def test_mask_small_count_unit(self):
        self.assertEqual(mask_small_count(4), "<5")
        self.assertEqual(mask_small_count(5), 5)


class DynamicFieldValidationTests(MapFixtureMixin, APITestCase):
    def setUp(self):
        self.build_map()
        MapItemField.objects.create(map=self.map, key="required_text", label="مطلوب",
                                    type="text", required=True, order=9)

    def test_unknown_keys_rejected(self):
        from rest_framework import serializers as drf
        with self.assertRaises(drf.ValidationError):
            validate_item_data(self.map, {"ghost": 1, "required_text": "ok"})

    def test_required_field_enforced(self):
        from rest_framework import serializers as drf
        with self.assertRaises(drf.ValidationError):
            validate_item_data(self.map, {"kind": "region"})

    def test_type_checks(self):
        from rest_framework import serializers as drf
        with self.assertRaises(drf.ValidationError):
            validate_item_data(self.map, {"required_text": "ok", "capacity": "كثير"})
        with self.assertRaises(drf.ValidationError):
            validate_item_data(self.map, {"required_text": "ok", "kind": "غير موجود"})
        cleaned = validate_item_data(self.map, {"required_text": "ok", "kind": "region", "capacity": 7})
        self.assertEqual(cleaned["capacity"], 7)

    def test_partial_merge_keeps_required(self):
        current = {"required_text": "ok", "capacity": 1}
        cleaned = validate_item_data(self.map, {"capacity": 5}, partial=True, current=current)
        self.assertEqual(cleaned, {"required_text": "ok", "capacity": 5})

    def test_admin_item_write_validates(self):
        boss = make_user("boss", role="admin")
        self.client.force_authenticate(boss)
        res = self.client.post(
            "/api/maps/admin/items/",
            {"map": self.map.id, "layer": self.public_layer.id, "lat": 24.0, "lng": 46.0,
             "name": "عنصر", "data": {"ghost": 1}},
            format="json",
        )
        self.assertEqual(res.status_code, 400)
        res = self.client.post(
            "/api/maps/admin/items/",
            {"map": self.map.id, "layer": self.public_layer.id, "lat": 24.0, "lng": 46.0,
             "name": "عنصر", "data": {"required_text": "موجود", "kind": "region"}},
            format="json",
        )
        self.assertEqual(res.status_code, 201)

    def test_layer_must_belong_to_map(self):
        boss = make_user("boss3", role="admin")
        other_project = Project.objects.create(name="آخر", slug="p-other")
        other_map = Map.objects.create(project=other_project, title="خريطة", visibility="public")
        foreign_layer = MapLayer.objects.create(map=other_map, name="غريبة", visibility="public")
        self.client.force_authenticate(boss)
        res = self.client.post(
            "/api/maps/admin/items/",
            {"map": self.map.id, "layer": foreign_layer.id, "lat": 24.0, "lng": 46.0,
             "name": "عنصر", "data": {"required_text": "x"}},
            format="json",
        )
        self.assertEqual(res.status_code, 400)


class MapAdminScopingTests(MapFixtureMixin, APITestCase):
    def setUp(self):
        self.build_map()
        self.super_admin = make_user("boss", role="admin")
        self.pa = make_user("pa1")
        self.stranger = make_user("stranger")
        ProjectMember.objects.create(project=self.project, user=self.pa, role="project_admin")
        self.other_project = Project.objects.create(name="آخر", slug="p2")
        self.other_map = Map.objects.create(project=self.other_project, title="خريطة 2", visibility="public")

    def test_scoped_map_list(self):
        self.client.force_authenticate(self.pa)
        res = self.client.get("/api/maps/admin/maps/")
        ids = {m["id"] for m in res.json()}
        self.assertIn(self.map.id, ids)
        self.assertNotIn(self.other_map.id, ids)

        self.client.force_authenticate(self.super_admin)
        res = self.client.get("/api/maps/admin/maps/")
        ids = {m["id"] for m in res.json()}
        self.assertTrue({self.map.id, self.other_map.id} <= ids)

    def test_stranger_denied(self):
        self.client.force_authenticate(self.stranger)
        res = self.client.get("/api/maps/admin/maps/")
        self.assertEqual(res.status_code, 403)

    def test_map_creation_super_admin_only(self):
        self.client.force_authenticate(self.pa)
        res = self.client.post(
            "/api/maps/admin/maps/",
            {"project": self.project.id, "title": "جديدة", "visibility": "public"},
            format="json",
        )
        self.assertEqual(res.status_code, 403)

        self.client.force_authenticate(self.super_admin)
        res = self.client.post(
            "/api/maps/admin/maps/",
            {"project": self.project.id, "title": "جديدة", "visibility": "public"},
            format="json",
        )
        self.assertEqual(res.status_code, 201)

    def test_project_admin_cannot_touch_other_projects_content(self):
        foreign_layer = MapLayer.objects.create(map=self.other_map, name="طبقة", visibility="public")
        self.client.force_authenticate(self.pa)
        res = self.client.post(
            "/api/maps/admin/items/",
            {"map": self.other_map.id, "layer": foreign_layer.id, "lat": 1, "lng": 1, "name": "x"},
            format="json",
        )
        self.assertIn(res.status_code, (403, 404, 400))
        self.assertEqual(MapItem.objects.filter(map=self.other_map).count(), 0)

    def test_contribution_moderation_actions(self):
        c = MapContribution.objects.create(map=self.map, name="م", phone="512345678",
                                           mode="self_distribution", quantity=2)
        self.client.force_authenticate(self.pa)
        res = self.client.post(f"/api/maps/admin/contributions/{c.id}/approve/")
        self.assertEqual(res.status_code, 200)
        c.refresh_from_db()
        self.assertEqual(c.status, "approved")
