from django.contrib.auth.models import User
from rest_framework.test import APITestCase


class AuthAndPermissionTests(APITestCase):
    def test_ping_is_public(self):
        res = self.client.get("/api/ping/")
        self.assertEqual(res.status_code, 200)

    def test_me_requires_auth(self):
        # الافتراض الآن IsAuthenticated → بلا توكن يجب 401
        res = self.client.get("/api/accounts/me/")
        self.assertEqual(res.status_code, 401)

    def test_register_saves_national_id_and_returns_tokens(self):
        payload = {
            "email": "t1@example.com", "password": "Hello12345!", "name": "T One",
            "gender": "ذكر", "age": 25, "city": "الرياض", "phone": "512345678",
            "qualification": "bachelor", "national_id": "1122334455",
            "region": "الرياض", "available_days": ["الأحد"], "skills": [],
        }
        res = self.client.post("/api/accounts/auth/register/", payload, format="json")
        self.assertEqual(res.status_code, 201)
        self.assertIn("access", res.data)
        self.assertIn("refresh", res.data)
        user = User.objects.get(email="t1@example.com")
        self.assertEqual(user.profile.national_id, "1122334455")
        self.assertEqual(user.profile.external_source, "web")

    def test_login_and_logout_blacklists_refresh(self):
        User.objects.create_user(username="u@example.com", email="u@example.com", password="Hello12345!")
        login = self.client.post(
            "/api/accounts/auth/token/",
            {"username": "u@example.com", "password": "Hello12345!"}, format="json",
        )
        self.assertEqual(login.status_code, 200)
        refresh = login.data["refresh"]
        access = login.data["access"]

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
        out = self.client.post("/api/accounts/logout/", {"refresh": refresh}, format="json")
        self.assertEqual(out.status_code, 200)

        # بعد الخروج: تجديد بنفس الـ refresh يجب أن يفشل
        self.client.credentials()
        again = self.client.post("/api/accounts/auth/token/refresh/", {"refresh": refresh}, format="json")
        self.assertEqual(again.status_code, 401)
