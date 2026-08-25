from django.contrib.auth.models import User
from rest_framework.test import APITestCase

from accounts.admin_users import MSG_LAST_ADMIN_DELETE, MSG_LAST_ADMIN_DISABLE, MSG_LAST_ADMIN_ROLE, MSG_SELF_DELETE


def make_user(email, role, password="Hello12345!", is_active=True):
    u = User.objects.create_user(username=email, email=email, password=password, is_active=is_active)
    u.profile.role = role
    u.profile.name = email.split("@")[0]
    u.profile.save()
    return u


class AdminUserManagementTests(APITestCase):
    def setUp(self):
        self.admin = make_user("adm@x.com", "admin")
        self.admin2 = make_user("adm2@x.com", "admin")
        self.vol = make_user("vol@x.com", "user")
        self.client.force_authenticate(self.admin)

    def test_list_paginated_and_no_password_hash(self):
        res = self.client.get("/api/accounts/users/")
        self.assertEqual(res.status_code, 200)
        self.assertIn("results", res.data)
        self.assertIn("count", res.data)
        self.assertGreaterEqual(res.data["count"], 3)
        row = res.data["results"][0]
        self.assertIn("email", row)
        self.assertIn("name", row)
        self.assertIn("role", row)
        self.assertIn("is_active", row)
        self.assertIn("date_joined", row)
        self.assertNotIn("password", row)
        blob = str(res.data)
        self.assertNotIn("pbkdf2", blob)
        self.assertNotIn("hasher", blob.lower())

    def test_retrieve_never_returns_password(self):
        res = self.client.get(f"/api/accounts/users/{self.vol.id}/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["email"], "vol@x.com")
        self.assertNotIn("password", res.data)

    def test_create_user(self):
        res = self.client.post(
            "/api/accounts/users/",
            {
                "email": "new@x.com",
                "name": "مستخدم جديد",
                "role": "manager",
                "password": "Hello12345!",
            },
            format="json",
        )
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data["email"], "new@x.com")
        self.assertEqual(res.data["role"], "manager")
        self.assertNotIn("password", res.data)
        created = User.objects.get(email="new@x.com")
        self.assertTrue(created.check_password("Hello12345!"))

    def test_partial_update_name_role_active(self):
        res = self.client.patch(
            f"/api/accounts/users/{self.vol.id}/",
            {"name": "متطوّع محدّث", "role": "employee", "is_active": False},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["name"], "متطوّع محدّث")
        self.assertEqual(res.data["role"], "employee")
        self.assertFalse(res.data["is_active"])

    def test_set_role_and_set_active(self):
        res = self.client.post(
            f"/api/accounts/users/{self.vol.id}/set_role/",
            {"role": "donor"},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["role"], "donor")
        res = self.client.post(
            f"/api/accounts/users/{self.vol.id}/set_active/",
            {"is_active": False},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        self.assertFalse(res.data["is_active"])

    def test_cannot_delete_self(self):
        res = self.client.delete(f"/api/accounts/users/{self.admin.id}/")
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.data["detail"], MSG_SELF_DELETE)
        self.assertTrue(User.objects.filter(pk=self.admin.pk).exists())

    def test_cannot_delete_last_admin(self):
        third = make_user("adm3@x.com", "admin")
        self.client.force_authenticate(self.admin)
        self.assertEqual(self.client.delete(f"/api/accounts/users/{third.id}/").status_code, 204)
        # تعطيل المشرف الحالي يترك admin2 آخر مشرف نشط؛ التوكن ما زال صالحاً في الاختبار
        res = self.client.post(
            f"/api/accounts/users/{self.admin.id}/set_active/",
            {"is_active": False},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        res = self.client.delete(f"/api/accounts/users/{self.admin2.id}/")
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.data["detail"], MSG_LAST_ADMIN_DELETE)
        self.assertTrue(User.objects.filter(pk=self.admin2.pk).exists())

    def test_cannot_demote_last_admin(self):
        self.client.delete(f"/api/accounts/users/{self.admin2.id}/")
        res = self.client.post(
            f"/api/accounts/users/{self.admin.id}/set_role/",
            {"role": "user"},
            format="json",
        )
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.data["detail"], MSG_LAST_ADMIN_ROLE)

    def test_cannot_disable_last_admin(self):
        self.client.delete(f"/api/accounts/users/{self.admin2.id}/")
        res = self.client.post(
            f"/api/accounts/users/{self.admin.id}/set_active/",
            {"is_active": False},
            format="json",
        )
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.data["detail"], MSG_LAST_ADMIN_DISABLE)

    def test_can_delete_second_admin(self):
        res = self.client.delete(f"/api/accounts/users/{self.admin2.id}/")
        self.assertEqual(res.status_code, 204)
        self.assertFalse(User.objects.filter(pk=self.admin2.pk).exists())

    def test_non_admin_gets_403(self):
        self.client.force_authenticate(self.vol)
        res = self.client.get("/api/accounts/users/")
        self.assertEqual(res.status_code, 403)
        res = self.client.post(
            "/api/accounts/users/",
            {"email": "x@x.com", "name": "x", "role": "user", "password": "Hello12345!"},
            format="json",
        )
        self.assertEqual(res.status_code, 403)
        res = self.client.delete(f"/api/accounts/users/{self.admin.id}/")
        self.assertEqual(res.status_code, 403)

    def test_unauthenticated_401(self):
        self.client.force_authenticate(None)
        res = self.client.get("/api/accounts/users/")
        self.assertEqual(res.status_code, 401)

    def test_search_and_filters(self):
        res = self.client.get("/api/accounts/users/", {"search": "vol@"})
        self.assertEqual(res.status_code, 200)
        emails = [r["email"] for r in res.data["results"]]
        self.assertEqual(emails, ["vol@x.com"])
        res = self.client.get("/api/accounts/users/", {"role": "admin"})
        self.assertTrue(all(r["role"] == "admin" for r in res.data["results"]))
        self.vol.is_active = False
        self.vol.save()
        res = self.client.get("/api/accounts/users/", {"is_active": "false"})
        self.assertTrue(all(r["is_active"] is False for r in res.data["results"]))
        self.assertGreaterEqual(res.data["count"], 1)
