from django.contrib.auth.models import User
from rest_framework.test import APITestCase

from core.activity import ACTION_USER_CREATE, ACTION_SETTINGS_CHANGE
from core.models import ActivityLog, StaticPage
from projects.models import Project
from sponsorships.models import Order


def make_user(email, role):
    u = User.objects.create_user(username=email, email=email, password="Hello12345!")
    u.profile.role = role
    u.profile.save()
    return u


class ActivityLogTests(APITestCase):
    def setUp(self):
        self.admin = make_user("adm@x.com", "admin")
        self.vol = make_user("vol@x.com", "user")
        self.donor = make_user("donor@x.com", "donor")
        self.client.force_authenticate(self.admin)

    def test_admin_only_read(self):
        self.client.force_authenticate(self.vol)
        self.assertEqual(self.client.get("/api/activity-logs/").status_code, 403)
        self.client.force_authenticate(self.admin)
        res = self.client.get("/api/activity-logs/")
        self.assertEqual(res.status_code, 200)
        self.assertIn("results", res.data)

    def test_append_only(self):
        self.assertEqual(self.client.post("/api/activity-logs/", {"action": "x"}, format="json").status_code, 405)
        log = ActivityLog.objects.create(actor=self.admin, action="user_create", summary="س")
        self.assertEqual(self.client.patch(f"/api/activity-logs/{log.id}/", {"summary": "لا"}, format="json").status_code, 405)
        self.assertEqual(self.client.delete(f"/api/activity-logs/{log.id}/").status_code, 405)
        self.assertTrue(ActivityLog.objects.filter(pk=log.pk).exists())

    def test_logs_sensitive_actions(self):
        secret = "SuperSecretPass99!"
        created = self.client.post(
            "/api/accounts/users/",
            {"email": "new@x.com", "name": "جديد", "role": "user", "password": secret},
            format="json",
        )
        self.assertEqual(created.status_code, 201)
        uid = created.data["id"]
        self.assertTrue(ActivityLog.objects.filter(action=ACTION_USER_CREATE, target_id=str(uid)).exists())

        self.client.patch(f"/api/accounts/users/{uid}/", {"name": "اسم"}, format="json")
        self.client.post(f"/api/accounts/users/{uid}/set_role/", {"role": "employee"}, format="json")
        self.client.post(f"/api/accounts/users/{uid}/set_active/", {"is_active": False}, format="json")
        self.client.delete(f"/api/accounts/users/{uid}/")

        proj = self.client.post("/api/platform/projects/", {"name": "سجل", "slug": "log-p"}, format="json")
        self.assertEqual(proj.status_code, 201)
        self.client.delete(f"/api/platform/projects/{proj.data['id']}/")

        self.client.force_authenticate(self.donor)
        sp = self.client.post("/api/saqya/sponsorships/", {"amount": "500", "type": "سقيا"}, format="json")
        self.client.force_authenticate(self.admin)
        self.client.post(f"/api/saqya/sponsorships/{sp.data['id']}/approve/", {}, format="json")
        order = Order.objects.get(sponsorship_id=sp.data["id"])
        self.client.post(f"/api/saqya/orders/{order.id}/assign/", {}, format="json")

        self.client.patch("/api/settings/", {"platform_name": "تكافل اختبار"}, format="json")
        self.assertTrue(ActivityLog.objects.filter(action=ACTION_SETTINGS_CHANGE).exists())

        page = StaticPage.objects.get(slug="terms")
        self.client.patch(f"/api/static-pages/{page.slug}/", {"is_published": True}, format="json")
        self.assertTrue(ActivityLog.objects.filter(action="static_page_publish", target_id=str(page.pk)).exists())

        self.client.post("/api/notifications/broadcast/", {"message": "تنبيه سجل", "role": "user"}, format="json")
        self.assertTrue(ActivityLog.objects.filter(action="broadcast").exists())

        blob = " ".join(ActivityLog.objects.values_list("summary", flat=True))
        self.assertNotIn(secret, blob)
        self.assertNotIn("pbkdf2", blob.lower())

        self.client.force_authenticate(self.admin)
        listed = self.client.get("/api/activity-logs/?action=user_create")
        self.assertEqual(listed.status_code, 200)
        self.assertGreaterEqual(listed.data["count"], 1)
        for row in listed.data["results"]:
            self.assertNotIn("password", row)
            self.assertNotIn(secret, str(row))

    def test_filters_by_actor_and_target_type(self):
        Project.objects.create(name="أ", slug="a-log")
        self.client.post("/api/platform/projects/", {"name": "ب", "slug": "b-log"}, format="json")
        res = self.client.get(f"/api/activity-logs/?actor={self.admin.id}&target_type=Project")
        self.assertEqual(res.status_code, 200)
        self.assertTrue(all(row["target_type"] == "Project" for row in res.data["results"]))
