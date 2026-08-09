"""Tests for per-project donation links (Phase A5, D-27)."""
from django.contrib.auth.models import User
from django.test import override_settings
from rest_framework.test import APITestCase

from projects.models import Project
from sponsorships.models import Sponsorship


def make_donor():
    u = User.objects.create_user(username="d@test.com", email="d@test.com", password="Hello12345!")
    u.profile.role = "donor"
    u.profile.save()
    return u


class DonationLinkTests(APITestCase):
    def setUp(self):
        self.donor = make_donor()
        self.project = Project.objects.create(
            name="سقيا", slug="saqya-donate", donation_url="https://store.test/saqya",
        )
        self.sp = Sponsorship.objects.create(
            donor=self.donor, project=self.project, amount=100, type="سقيا",
        )

    @override_settings(EXTERNAL_STORE_URL="https://fallback.test/donate")
    def test_checkout_prefers_project_donation_url(self):
        self.client.force_authenticate(self.donor)
        res = self.client.get(f"/api/saqya/sponsorships/{self.sp.id}/checkout_url/?amount=50")
        self.assertEqual(res.status_code, 200)
        self.assertIn("https://store.test/saqya", res.json()["redirect_url"])

    @override_settings(EXTERNAL_STORE_URL="https://fallback.test/donate")
    def test_checkout_falls_back_to_external_store(self):
        self.project.donation_url = ""
        self.project.save()
        self.client.force_authenticate(self.donor)
        res = self.client.get(f"/api/saqya/sponsorships/{self.sp.id}/checkout_url/?amount=50")
        self.assertEqual(res.status_code, 200)
        self.assertIn("https://fallback.test/donate", res.json()["redirect_url"])

    def test_public_project_exposes_donation_fields(self):
        res = self.client.get("/api/platform/public/projects/saqya-donate/")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["donation_url"], "https://store.test/saqya")
        self.assertEqual(data["donation_label"], "تبرع الآن")

    def test_reject_non_https_donation_url(self):
        admin = User.objects.create_user(username="a@test.com", email="a@test.com", password="Hello12345!")
        admin.profile.role = "admin"
        admin.profile.save()
        self.client.force_authenticate(admin)
        res = self.client.patch(
            f"/api/platform/projects/{self.project.id}/",
            {"donation_url": "http://insecure.test/pay"},
            format="json",
        )
        self.assertEqual(res.status_code, 400)

    def test_reject_malformed_donation_url(self):
        admin = User.objects.create_user(username="a2@test.com", email="a2@test.com", password="Hello12345!")
        admin.profile.role = "admin"
        admin.profile.save()
        self.client.force_authenticate(admin)
        res = self.client.patch(
            f"/api/platform/projects/{self.project.id}/",
            {"donation_url": "not-a-url"},
            format="json",
        )
        self.assertEqual(res.status_code, 400)
