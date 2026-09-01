"""اختبارات المرحلة 4: محلّل الإحداثيات المتساهل + رفع المواقع بالجملة."""
import io

from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework.test import APITestCase

from projects.models import Project
from .coordinates import parse_coordinates
from .models import Map, MapItem, MapLayer


def make_user(username, role="user"):
    u = User.objects.create_user(username=username, email=f"{username}@t.local", password="pass12345")
    u.profile.role = role
    u.profile.save()
    return u


class CoordinateParserTests(APITestCase):
    def test_raw_lat_lng(self):
        self.assertEqual(parse_coordinates("24.7136, 46.6753"), (24.7136, 46.6753))
        self.assertEqual(parse_coordinates("24.7136 46.6753"), (24.7136, 46.6753))

    def test_google_at_pattern(self):
        url = "https://www.google.com/maps/@24.7136,46.6753,15z"
        self.assertEqual(parse_coordinates(url), (24.7136, 46.6753))

    def test_google_query_param(self):
        self.assertEqual(parse_coordinates("https://maps.google.com/?q=24.7136,46.6753"), (24.7136, 46.6753))

    def test_google_3d4d_pattern(self):
        url = "https://www.google.com/maps/place/x/data=!3d24.7136!4d46.6753"
        self.assertEqual(parse_coordinates(url), (24.7136, 46.6753))

    def test_geo_uri(self):
        self.assertEqual(parse_coordinates("geo:24.7136,46.6753"), (24.7136, 46.6753))

    def test_key_value_any_order(self):
        self.assertEqual(parse_coordinates("lng=46.6753&lat=24.7136"), (24.7136, 46.6753))

    def test_out_of_range_rejected(self):
        self.assertIsNone(parse_coordinates("200, 400"))

    def test_garbage_rejected(self):
        self.assertIsNone(parse_coordinates("لا يوجد إحداثيات"))
        self.assertIsNone(parse_coordinates(""))
        self.assertIsNone(parse_coordinates(None))


class BulkUploadTests(APITestCase):
    def setUp(self):
        self.admin = make_user("boss", role="admin")
        self.project = Project.objects.create(name="مشروع", slug="proj-bulk")
        self.map = Map.objects.create(project=self.project, title="خريطة", visibility="public",
                                      published_at=timezone.now())
        self.layer = MapLayer.objects.create(map=self.map, name="الطبقة الأولى", visibility="public", order=0)

    def test_template_download(self):
        self.client.force_authenticate(self.admin)
        res = self.client.get(f"/api/maps/admin/items/template/?map={self.map.id}")
        self.assertEqual(res.status_code, 200)
        self.assertIn("name", res.data)
        self.assertIn("coordinates", res.data)

    def test_bulk_upload_csv_with_links(self):
        self.client.force_authenticate(self.admin)
        csv_text = (
            "name,coordinates,layer\n"
            "مركز أ,\"https://maps.google.com/?q=24.7136,46.6753\",الطبقة الأولى\n"
            "مركز ب,\"24.5,46.5\",الطبقة الأولى\n"
            "بلا إحداثيات,\"نص غير صالح\",الطبقة الأولى\n"
        )
        upload = io.BytesIO(csv_text.encode("utf-8"))
        upload.name = "items.csv"
        res = self.client.post(
            "/api/maps/admin/items/bulk_upload/",
            {"map": self.map.id, "file": upload},
            format="multipart",
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["created"], 2)
        self.assertEqual(len(res.data["errors"]), 1)
        self.assertEqual(MapItem.objects.filter(map=self.map).count(), 2)

    def test_bulk_upload_json_rows(self):
        self.client.force_authenticate(self.admin)
        res = self.client.post(
            "/api/maps/admin/items/bulk_upload/",
            {"map": self.map.id, "rows": [
                {"name": "س", "coordinates": "geo:24.1,46.1"},
                {"name": "ص", "lat": "24.2", "lng": "46.2"},
            ]},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["created"], 2)

    def test_bulk_upload_requires_edit_permission(self):
        stranger = make_user("stranger", role="user")
        self.client.force_authenticate(stranger)
        res = self.client.post(
            "/api/maps/admin/items/bulk_upload/",
            {"map": self.map.id, "rows": [{"name": "س", "coordinates": "24.1,46.1"}]},
            format="json",
        )
        self.assertIn(res.status_code, (403, 404))
