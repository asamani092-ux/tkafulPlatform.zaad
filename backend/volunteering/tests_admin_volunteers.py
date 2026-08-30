"""UAT Phase 4 — متطوعون: مدينة/بحث/إنشاء معتمد."""
from django.contrib.auth.models import User
from rest_framework.test import APITestCase


class VolunteerAdminCrudTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username="adm@v4.com", email="adm@v4.com", password="Hello12345!"
        )
        self.admin.profile.role = "admin"
        self.admin.profile.save()
        self.client.force_authenticate(self.admin)

    def test_create_volunteer_shows_city_and_search(self):
        res = self.client.post("/api/accounts/users/", {
            "email": "vol@v4.com", "name": "متطوّع تجريبي", "role": "user",
            "password": "Hello12345!", "city": "صنعاء",
        }, format="json")
        self.assertEqual(res.status_code, 201, res.data)
        uid = res.data["id"]
        user = User.objects.get(pk=uid)
        self.assertTrue(user.profile.is_approved)
        self.assertEqual(user.profile.city, "صنعاء")

        lst = self.client.get("/api/volunteers/?q=صنعاء")
        self.assertEqual(lst.status_code, 200)
        rows = lst.data["results"]
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["city"], "صنعاء")
        self.assertEqual(rows[0]["name"], "متطوّع تجريبي")

        patch = self.client.patch(f"/api/accounts/users/{uid}/", {"city": "عدن", "name": "محدَّث"}, format="json")
        self.assertEqual(patch.status_code, 200)
        lst2 = self.client.get("/api/volunteers/?q=عدن")
        self.assertEqual(len(lst2.data["results"]), 1)
        self.assertEqual(lst2.data["results"][0]["city"], "عدن")
