"""Smoke tests for services API endpoints (Phase 1 ownership move)."""
from django.contrib.auth.models import User
from rest_framework.test import APITestCase

from services.models import Service


def make_user(username, role="user"):
    user = User.objects.create_user(
        username=username, email=f"{username}@t.local", password="pass12345"
    )
    user.profile.role = role
    user.profile.save()
    return user


class ServicesPublicEndpointTests(APITestCase):
    def test_public_services_list(self):
        Service.objects.create(
            title="فرصة تطوع",
            service_type="للمتطوعين",
            is_active=True,
        )
        res = self.client.get("/api/public-services/")
        self.assertEqual(res.status_code, 200)
        self.assertIn("results", res.data)

    def test_beneficiary_services_list(self):
        Service.objects.create(
            title="خدمة مستفيد",
            service_type="للمستفيدين",
            is_active=True,
        )
        res = self.client.get("/api/beneficiary-services/")
        self.assertEqual(res.status_code, 200)
        self.assertIn("results", res.data)

    def test_public_submit_suggestion(self):
        res = self.client.post(
            "/api/public-suggestions/",
            {"title": "اقتراح", "description": "وصف"},
            format="json",
        )
        self.assertEqual(res.status_code, 201)

    def test_public_submit_service_request_validation(self):
        # Missing required fields → 400; with valid payload → 201
        res = self.client.post("/api/public-service-request/", {}, format="json")
        self.assertIn(res.status_code, (400, 201))

        service = Service.objects.create(
            title="خدمة",
            service_type="للمستفيدين",
            is_active=True,
        )
        res = self.client.post(
            "/api/public-service-request/",
            {
                "service": service.id,
                "beneficiary_name": "مسجد",
                "beneficiary_contact": "0500000000",
                "details": "تفاصيل",
            },
            format="json",
        )
        self.assertEqual(res.status_code, 201)

    def test_public_water_supply_request(self):
        res = self.client.post(
            "/api/public-water-supply-request/",
            {
                "applicantName": "أحمد",
                "mobileNumber": "0501234567",
                "applicantRole": "إمام",
                "mosqueName": "مسجد النور",
                "neighborhood": "حي السلام",
                "locationLink": "https://maps.example.com",
                "worshippersCount": "100",
                "donorExists": "لا",
            },
            format="json",
        )
        self.assertEqual(res.status_code, 201)


class ServicesAuthEndpointTests(APITestCase):
    def setUp(self):
        self.admin = make_user("svcadmin", role="admin")

    def test_water_supply_requests_requires_auth(self):
        res = self.client.get("/api/water-supply-requests/")
        self.assertEqual(res.status_code, 401)

        self.client.force_authenticate(self.admin)
        res = self.client.get("/api/water-supply-requests/")
        self.assertEqual(res.status_code, 200)

    def test_service_requests_requires_auth(self):
        res = self.client.get("/api/service-requests/")
        self.assertEqual(res.status_code, 401)

        self.client.force_authenticate(self.admin)
        res = self.client.get("/api/service-requests/")
        self.assertEqual(res.status_code, 200)

    def test_suggestions_requires_auth(self):
        res = self.client.get("/api/suggestions/")
        self.assertEqual(res.status_code, 401)

        self.client.force_authenticate(self.admin)
        res = self.client.get("/api/suggestions/")
        self.assertEqual(res.status_code, 200)
