from django.contrib.auth.models import User
from rest_framework.test import APITestCase


class PublicVolunteersStatsTests(APITestCase):
    def test_returns_aggregates_only(self):
        u = User.objects.create_user(username="v@x.com", email="v@x.com", password="Hello12345!")
        u.profile.role = "user"
        u.profile.is_approved = True
        u.profile.gender = "ذكر"
        u.profile.save()

        res = self.client.get("/api/public-volunteers-stats/")
        self.assertEqual(res.status_code, 200)
        self.assertIn("total_volunteers", res.data)
        self.assertIn("by_gender", res.data)
        self.assertIn("total_hours", res.data)
        self.assertNotIsInstance(res.data, list)
        for key in res.data:
            self.assertNotIn("id", res.data[key] if isinstance(res.data[key], dict) else {})


class SuggestionPermissionTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(username="a@x.com", email="a@x.com", password="Hello12345!")
        self.admin.profile.role = "admin"
        self.admin.profile.save()

    def test_public_can_post_suggestion(self):
        res = self.client.post("/api/public-suggestions/", {"title": "x", "description": "y"}, format="json")
        self.assertEqual(res.status_code, 201)

    def test_anonymous_cannot_list_suggestions(self):
        res = self.client.get("/api/suggestions/")
        self.assertEqual(res.status_code, 401)

    def test_admin_can_list_suggestions(self):
        self.client.force_authenticate(self.admin)
        res = self.client.get("/api/suggestions/")
        self.assertEqual(res.status_code, 200)
