from copy import deepcopy

from django.conf import settings
from django.contrib.auth.models import User
from django.core.cache import cache
from django.test import override_settings
from rest_framework.settings import api_settings
from rest_framework.test import APITestCase

from django.core.files.uploadedfile import SimpleUploadedFile

from notifications.models import Notification, NotificationPreference
from notifications.services import (
    EVENT_SERVICE_REQUEST,
    EVENT_WATER_SUPPLY,
    EVENT_VOLUNTEER,
    EVENT_PROJECT,
    EVENT_SPONSORSHIP,
)
from projects.models import Project
from services.models import Service
from sponsorships.models import Order


def make_user(email, role):
    u = User.objects.create_user(username=email, email=email, password="Hello12345!")
    u.profile.role = role
    u.profile.save()
    return u


class NotificationCenterTests(APITestCase):
    def setUp(self):
        self.admin = make_user("adm@x.com", "admin")
        self.vol = make_user("vol@x.com", "user")
        self.donor = make_user("donor@x.com", "donor")

    def _admin_unread(self):
        return Notification.objects.filter(user=self.admin, status="unread")

    def test_service_request_notifies_admin(self):
        svc = Service.objects.create(title="س", service_type="للمستفيدين")
        res = self.client.post(
            "/api/public-service-request/",
            {"service": svc.id, "beneficiary_name": "أ", "beneficiary_contact": "5", "details": "د"},
            format="json",
        )
        self.assertEqual(res.status_code, 201)
        self.assertTrue(self._admin_unread().filter(event_type=EVENT_SERVICE_REQUEST).exists())

    def test_water_supply_notifies_admin(self):
        res = self.client.post(
            "/api/public-water-supply-request/",
            {
                "applicantName": "م",
                "mobileNumber": "512345678",
                "applicantRole": "إمام",
                "mosqueName": "جامع",
                "neighborhood": "حي",
                "locationLink": "https://maps.example.com/x",
                "worshippersCount": 10,
                "donorExists": "لا",
            },
            format="json",
        )
        self.assertEqual(res.status_code, 201)
        self.assertTrue(self._admin_unread().filter(event_type=EVENT_WATER_SUPPLY).exists())

    def test_volunteer_application_notifies_admin(self):
        from volunteering.models import VolunteeringProfile
        p = Project.objects.create(name="تطوع", slug="vol-p", status="active", is_active=True)
        VolunteeringProfile.objects.create(project=p, volunteer_status="ACTIVE", is_hidden=False)
        self.client.force_authenticate(self.vol)
        res = self.client.post(f"/api/user/opportunities/{p.id}/apply/", {"message": "أرغب"}, format="json")
        self.assertEqual(res.status_code, 200)
        self.assertTrue(self._admin_unread().filter(event_type=EVENT_VOLUNTEER).exists())

    def test_project_status_change_notifies_admin(self):
        p = Project.objects.create(name="م", slug="st-p", status="active")
        self.client.force_authenticate(self.admin)
        res = self.client.patch(f"/api/platform/projects/{p.id}/", {"status": "completed"}, format="json")
        self.assertEqual(res.status_code, 200)
        self.assertTrue(self._admin_unread().filter(event_type=EVENT_PROJECT).exists())

    def _approved_order(self):
        self.client.force_authenticate(self.donor)
        sp = self.client.post("/api/saqya/sponsorships/", {"amount": "500", "type": "سقيا"}, format="json")
        self.client.force_authenticate(self.admin)
        res = self.client.post(f"/api/saqya/sponsorships/{sp.data['id']}/approve/", {}, format="json")
        self.assertEqual(res.status_code, 200)
        return Order.objects.get(sponsorship_id=sp.data["id"])

    def test_sponsorship_approve_notifies_admin(self):
        self._approved_order()
        self.assertTrue(self._admin_unread().filter(event_type=EVENT_SPONSORSHIP).exists())

    def test_sponsorship_assign_notifies_admin(self):
        supplier = make_user("sup@x.com", "supplier")
        order = self._approved_order()
        Notification.objects.filter(user=self.admin).delete()
        self.client.force_authenticate(self.admin)
        res = self.client.post(
            f"/api/saqya/orders/{order.id}/assign/",
            {"supplier_id": supplier.id},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        self.assertTrue(self._admin_unread().filter(event_type=EVENT_SPONSORSHIP).exists())

    def test_sponsorship_deliver_notifies_admin(self):
        order = self._approved_order()
        Notification.objects.filter(user=self.admin).delete()
        self.client.force_authenticate(self.admin)
        res = self.client.post(f"/api/saqya/orders/{order.id}/deliver/", {}, format="json")
        self.assertEqual(res.status_code, 200)
        self.assertTrue(self._admin_unread().filter(event_type=EVENT_SPONSORSHIP).exists())

    def test_sponsorship_documented_notifies_admin(self):
        supplier = make_user("sup2@x.com", "supplier")
        order = self._approved_order()
        order.supplier = supplier
        order.save()
        Notification.objects.filter(user=self.admin).delete()
        self.client.force_authenticate(supplier)
        res = self.client.post(
            "/api/saqya/documentation/",
            {
                "order": order.id,
                "type": "photo",
                "file": SimpleUploadedFile("p.jpg", b"x", content_type="image/jpeg"),
            },
            format="multipart",
        )
        self.assertEqual(res.status_code, 201)
        self.assertTrue(self._admin_unread().filter(event_type=EVENT_SPONSORSHIP).exists())

    def test_preference_muting(self):
        NotificationPreference.objects.create(
            user=self.admin, event_type=EVENT_SERVICE_REQUEST, enabled=False
        )
        svc = Service.objects.create(title="س2", service_type="للمستفيدين")
        self.client.post(
            "/api/public-service-request/",
            {"service": svc.id, "beneficiary_name": "أ", "beneficiary_contact": "5", "details": "د"},
            format="json",
        )
        self.assertFalse(self._admin_unread().filter(event_type=EVENT_SERVICE_REQUEST).exists())

    def test_unread_count_and_mark_read(self):
        notify_msg = Notification.objects.create(user=self.vol, message="مرحبا")
        self.client.force_authenticate(self.vol)
        res = self.client.get("/api/notifications/unread-count/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["count"], 1)
        res = self.client.get("/api/notifications/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["results"][0]["is_read"], False)
        self.client.post(f"/api/notifications/{notify_msg.id}/read/")
        self.assertEqual(self.client.get("/api/notifications/unread-count/").data["count"], 0)

    def test_broadcast_admin_only(self):
        self.client.force_authenticate(self.vol)
        res = self.client.post("/api/notifications/broadcast/", {"message": "تنبيه"}, format="json")
        self.assertEqual(res.status_code, 403)
        self.client.force_authenticate(self.admin)
        res = self.client.post("/api/notifications/broadcast/", {"message": "تنبيه", "role": "user"}, format="json")
        self.assertEqual(res.status_code, 201)
        self.assertTrue(Notification.objects.filter(user=self.vol, event_type="broadcast").exists())

    def test_cannot_mark_another_users_notification(self):
        n = Notification.objects.create(user=self.admin, message="خاص")
        self.client.force_authenticate(self.vol)
        res = self.client.post(f"/api/notifications/{n.id}/read/")
        self.assertEqual(res.status_code, 404)
        n.refresh_from_db()
        self.assertEqual(n.status, "unread")

    def test_preferences_get_and_put(self):
        self.client.force_authenticate(self.vol)
        res = self.client.get("/api/notifications/preferences/")
        self.assertEqual(res.status_code, 200)
        types = {row["event_type"] for row in res.data["results"]}
        self.assertIn(EVENT_SERVICE_REQUEST, types)
        put = self.client.put(
            "/api/notifications/preferences/",
            {"event_type": EVENT_SERVICE_REQUEST, "enabled": False},
            format="json",
        )
        self.assertEqual(put.status_code, 200)
        pref = NotificationPreference.objects.get(user=self.vol, event_type=EVENT_SERVICE_REQUEST)
        self.assertFalse(pref.enabled)

    def test_mark_all_read(self):
        Notification.objects.create(user=self.vol, message="أ")
        Notification.objects.create(user=self.vol, message="ب")
        self.client.force_authenticate(self.vol)
        res = self.client.post("/api/notifications/mark-all-read/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(self.client.get("/api/notifications/unread-count/").data["count"], 0)


@override_settings(CACHES={"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}})
class BroadcastThrottleTests(APITestCase):
    def setUp(self):
        cache.clear()
        rf = deepcopy(settings.REST_FRAMEWORK)
        rates = dict(rf.get("DEFAULT_THROTTLE_RATES", {}))
        rates["broadcast"] = "1/min"
        rf["DEFAULT_THROTTLE_RATES"] = rates
        self._override = override_settings(REST_FRAMEWORK=rf)
        self._override.enable()
        api_settings.reload()
        self.addCleanup(self._override.disable)
        self.addCleanup(api_settings.reload)
        self.admin = make_user("adm-th@x.com", "admin")
        self.client.force_authenticate(self.admin)

    def test_broadcast_throttle(self):
        first = self.client.post("/api/notifications/broadcast/", {"message": "1"}, format="json")
        self.assertEqual(first.status_code, 201)
        second = self.client.post("/api/notifications/broadcast/", {"message": "2"}, format="json")
        self.assertEqual(second.status_code, 429)
