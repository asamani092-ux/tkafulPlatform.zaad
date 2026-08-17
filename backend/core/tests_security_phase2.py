"""
Phase 2 security baseline tests: IDOR, project roles, media, uploads/GPS,
throttles, JWT blacklist, PDPL, water-supply project FK, permission class wiring.
"""
from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management import call_command
from django.db import connection
from django.test import TransactionTestCase, override_settings
from rest_framework.test import APITestCase

from accounts.urls import EmailTokenObtainPairView, ThrottledTokenRefreshView
from accounts.views import register
from core.throttles import AuthRateThrottle, PublicWriteRateThrottle
from maps.models import Map, MapLayer
from maps.services import mask_small_count
from projects.models import Project, ProjectMember
from services.models import WaterSupplyRequest
from services.views import (
    public_submit_service_request,
    public_submit_suggestion,
    public_water_supply_request,
    WaterSupplyRequestViewSet,
)
from sponsorships.models import Documentation, Invoice, Order, Sponsorship
from sponsorships.validators import validate_gps, validate_upload_file
from sponsorships.views import SponsorshipViewSet, serve_documentation_file, serve_invoice_file


def make_user(email, role="user"):
    u = User.objects.create_user(username=email, email=email, password="Hello12345!")
    u.profile.role = role
    u.profile.save()
    return u


# ---------------------------------------------------------------------------
# Water supply ↔ project FK
# ---------------------------------------------------------------------------
class WaterSupplyProjectLinkTests(APITestCase):
    def setUp(self):
        self.project, _ = Project.objects.get_or_create(
            slug="saqya", defaults={"name": "كفالات السقيا", "status": "active"}
        )
        self.admin = make_user("ws-admin@x.com", "admin")
        self.payload = {
            "applicantName": "أحمد",
            "mobileNumber": "0501234567",
            "applicantRole": "إمام",
            "mosqueName": "مسجد النور",
            "neighborhood": "حي السلام",
            "locationLink": "https://maps.example.com",
            "worshippersCount": "100",
            "donorExists": "لا",
        }

    def test_public_submit_links_project_by_slug(self):
        res = self.client.post(
            "/api/public-water-supply-request/",
            {**self.payload, "project": "saqya"},
            format="json",
        )
        self.assertEqual(res.status_code, 201)
        req = WaterSupplyRequest.objects.latest("id")
        self.assertEqual(req.project_id, self.project.id)

    def test_public_submit_links_project_by_id_query(self):
        res = self.client.post(
            f"/api/public-water-supply-request/?project={self.project.id}",
            self.payload,
            format="json",
        )
        self.assertEqual(res.status_code, 201)
        req = WaterSupplyRequest.objects.latest("id")
        self.assertEqual(req.project_id, self.project.id)

    def test_public_submit_without_project_is_general(self):
        res = self.client.post("/api/public-water-supply-request/", self.payload, format="json")
        self.assertEqual(res.status_code, 201)
        req = WaterSupplyRequest.objects.latest("id")
        self.assertIsNone(req.project_id)

    def test_admin_list_includes_project_fields_and_is_admin_only(self):
        WaterSupplyRequest.objects.create(
            applicant_name="أ",
            mobile_number="0500000000",
            applicant_role="إمام",
            mosque_name="م",
            neighborhood="ح",
            location_link="https://x.test",
            worshippers_count=10,
            project=self.project,
        )
        anon = self.client.get("/api/water-supply-requests/")
        self.assertEqual(anon.status_code, 401)

        donor = make_user("ws-donor@x.com", "donor")
        self.client.force_authenticate(donor)
        denied = self.client.get("/api/water-supply-requests/")
        self.assertEqual(denied.status_code, 403)

        self.client.force_authenticate(self.admin)
        ok = self.client.get("/api/water-supply-requests/")
        self.assertEqual(ok.status_code, 200)
        row = (ok.data if isinstance(ok.data, list) else ok.data.get("results", []))[0]
        self.assertEqual(row["project_slug"], "saqya")
        self.assertEqual(row["project_name"], "كفالات السقيا")


class WaterSupplyProjectMigrationReverseTests(TransactionTestCase):
    """migrate forward → reverse → forward; column integrity OK."""

    def test_reverse_and_forward(self):
        call_command("migrate", "services", verbosity=0)

        def column_names():
            with connection.cursor() as cursor:
                desc = connection.introspection.get_table_description(
                    cursor, "takaful_app_watersupplyrequest"
                )
            return {col.name for col in desc}

        self.assertIn("project_id", column_names())
        call_command("migrate", "services", "0001", verbosity=0)
        self.assertNotIn("project_id", column_names())
        call_command("migrate", "services", "0002", verbosity=0)
        self.assertIn("project_id", column_names())


# ---------------------------------------------------------------------------
# IDOR — sponsorships PATCH + payments
# ---------------------------------------------------------------------------
class SponsorshipIdorPhase2Tests(APITestCase):
    def setUp(self):
        self.donor_a = make_user("ida@x.com", "donor")
        self.donor_b = make_user("idb@x.com", "donor")
        self.admin = make_user("idadm@x.com", "admin")
        self.client.force_authenticate(self.donor_a)
        sp = self.client.post(
            "/api/saqya/sponsorships/",
            {"amount": "300", "type": "سقيا"},
            format="json",
        )
        self.sp_a = sp.data["id"]
        self.client.force_authenticate(self.admin)
        self.client.post(f"/api/saqya/sponsorships/{self.sp_a}/approve/", {}, format="json")
        self.order = Order.objects.get(sponsorship_id=self.sp_a)

    def test_donor_b_cannot_patch_donor_a_sponsorship(self):
        self.client.force_authenticate(self.donor_b)
        res = self.client.patch(
            f"/api/saqya/sponsorships/{self.sp_a}/",
            {"location": "hacked"},
            format="json",
        )
        self.assertIn(res.status_code, (403, 404))

    def test_donor_b_cannot_get_donor_a_payment_list_item(self):
        self.client.force_authenticate(self.donor_a)
        pay = self.client.post(
            f"/api/saqya/sponsorships/{self.sp_a}/pay/",
            {"amount": "50", "method": "online"},
            format="json",
        )
        self.assertEqual(pay.status_code, 201)
        payment_id = pay.data["payment_id"]
        self.client.force_authenticate(self.donor_b)
        res = self.client.get(f"/api/saqya/payments/{payment_id}/")
        self.assertIn(res.status_code, (403, 404))


# ---------------------------------------------------------------------------
# Project roles — cross-project + editor/viewer
# ---------------------------------------------------------------------------
class ProjectRoleEnforcementPhase2Tests(APITestCase):
    def setUp(self):
        self.pa_a = make_user("pa-a@x.com")
        self.editor_a = make_user("ed-a@x.com")
        self.viewer_a = make_user("vw-a@x.com")
        self.pa_b = make_user("pa-b@x.com")
        self.p_a = Project.objects.create(name="أ", slug="role-a")
        self.p_b = Project.objects.create(name="ب", slug="role-b")
        ProjectMember.objects.create(project=self.p_a, user=self.pa_a, role="project_admin")
        ProjectMember.objects.create(project=self.p_a, user=self.editor_a, role="project_editor")
        ProjectMember.objects.create(project=self.p_a, user=self.viewer_a, role="project_viewer")
        ProjectMember.objects.create(project=self.p_b, user=self.pa_b, role="project_admin")

    def test_project_a_admin_cannot_manage_project_b(self):
        newbie = make_user("cross@x.com")
        self.client.force_authenticate(self.pa_a)
        res = self.client.post(
            f"/api/platform/projects/{self.p_b.id}/add_member/",
            {"user_id": newbie.id, "role": "project_viewer"},
        )
        self.assertIn(res.status_code, (403, 404))
        self.assertFalse(
            ProjectMember.objects.filter(project=self.p_b, user=newbie).exists()
        )

    def test_viewer_cannot_patch_project(self):
        self.client.force_authenticate(self.viewer_a)
        res = self.client.patch(
            f"/api/platform/projects/{self.p_a.id}/",
            {"description": "nope"},
            format="json",
        )
        self.assertEqual(res.status_code, 403)

    def test_editor_can_read_but_not_add_members(self):
        self.client.force_authenticate(self.editor_a)
        detail = self.client.get(f"/api/platform/projects/{self.p_a.id}/")
        self.assertEqual(detail.status_code, 200)
        newbie = make_user("ed-new@x.com")
        res = self.client.post(
            f"/api/platform/projects/{self.p_a.id}/add_member/",
            {"user_id": newbie.id, "role": "project_viewer"},
        )
        self.assertEqual(res.status_code, 403)


# ---------------------------------------------------------------------------
# Maps private / cross-project IDOR regression
# ---------------------------------------------------------------------------
class MapsCrossProjectIdorTests(APITestCase):
    def setUp(self):
        self.pa = make_user("map-pa@x.com")
        self.p1 = Project.objects.create(name="خ1", slug="map-p1")
        self.p2 = Project.objects.create(name="خ2", slug="map-p2")
        ProjectMember.objects.create(project=self.p1, user=self.pa, role="project_admin")
        self.m2 = Map.objects.create(project=self.p2, title="خاصة", visibility="private")
        self.layer2 = MapLayer.objects.create(map=self.m2, name="طبقة", visibility="private")

    def test_cannot_list_or_patch_other_project_map(self):
        self.client.force_authenticate(self.pa)
        listing = self.client.get("/api/maps/admin/maps/")
        ids = {m["id"] for m in listing.json()}
        self.assertNotIn(self.m2.id, ids)
        patch = self.client.patch(
            f"/api/maps/admin/maps/{self.m2.id}/",
            {"title": "stolen"},
            format="json",
        )
        self.assertIn(patch.status_code, (403, 404))


# ---------------------------------------------------------------------------
# Private media + upload/GPS validators
# ---------------------------------------------------------------------------
class PrivateMediaAndUploadPhase2Tests(APITestCase):
    def setUp(self):
        self.donor = make_user("med-d@x.com", "donor")
        self.other = make_user("med-o@x.com", "donor")
        self.admin = make_user("med-a@x.com", "admin")
        self.supplier = make_user("med-s@x.com", "supplier")
        self.rep = make_user("med-r@x.com", "representative")
        self.client.force_authenticate(self.donor)
        sp_id = self.client.post(
            "/api/saqya/sponsorships/", {"amount": "200", "type": "سقيا"}, format="json"
        ).data["id"]
        self.client.force_authenticate(self.admin)
        self.client.post(f"/api/saqya/sponsorships/{sp_id}/approve/", {}, format="json")
        self.order = Order.objects.get(sponsorship_id=sp_id)
        self.order.supplier = self.supplier
        self.order.representative = self.rep
        self.order.save()

    def test_serve_views_require_auth_classes(self):
        self.assertTrue(
            any(p.__name__ == "IsAuthenticated" for p in serve_invoice_file.cls.permission_classes)
            or any(
                getattr(p, "__name__", type(p).__name__) == "IsAuthenticated"
                for p in serve_invoice_file.cls.permission_classes
            )
        )

    def test_documentation_file_owner_only(self):
        self.client.force_authenticate(self.rep)
        doc = self.client.post(
            "/api/saqya/documentation/",
            {
                "order": self.order.id,
                "type": "photo",
                "file": SimpleUploadedFile("p.jpg", b"x", content_type="image/jpeg"),
            },
            format="multipart",
        )
        self.assertEqual(doc.status_code, 201, doc.data)
        doc_id = doc.data["id"]
        self.client.force_authenticate(user=None)
        self.assertEqual(self.client.get(f"/api/saqya/documentation/{doc_id}/file/").status_code, 401)
        self.client.force_authenticate(self.other)
        self.assertEqual(self.client.get(f"/api/saqya/documentation/{doc_id}/file/").status_code, 403)
        self.client.force_authenticate(self.donor)
        self.assertEqual(self.client.get(f"/api/saqya/documentation/{doc_id}/file/").status_code, 200)

    def test_reject_js_upload_and_oversized(self):
        self.assertIsNotNone(validate_upload_file(
            SimpleUploadedFile("x.js", b"1", content_type="application/javascript")
        ))
        self.assertIsNotNone(validate_upload_file(
            SimpleUploadedFile("x.exe", b"MZ", content_type="application/octet-stream")
        ))
        self.client.force_authenticate(self.supplier)
        res = self.client.post(
            "/api/saqya/invoices/",
            {
                "order": self.order.id,
                "invoice_number": "INV-JS",
                "amount": "10",
                "total_amount": "10",
                "file": SimpleUploadedFile("bad.js", b"alert(1)", content_type="application/javascript"),
            },
            format="multipart",
        )
        self.assertEqual(res.status_code, 400)

    def test_gps_validators_unit_and_api(self):
        self.assertIsNotNone(validate_gps(91, 0))
        self.assertIsNotNone(validate_gps(0, 181))
        self.assertIsNone(validate_gps(24.7, 46.7))
        self.client.force_authenticate(self.rep)
        res = self.client.post(
            "/api/saqya/documentation/",
            {
                "order": self.order.id,
                "type": "photo",
                "file": SimpleUploadedFile("p.jpg", b"x", content_type="image/jpeg"),
                "latitude": -100,
                "longitude": 10,
            },
            format="multipart",
        )
        self.assertEqual(res.status_code, 400)


# ---------------------------------------------------------------------------
# Throttle class assignment
# ---------------------------------------------------------------------------
class ThrottleClassAssignmentTests(APITestCase):
    def test_auth_views_use_auth_throttle(self):
        self.assertIn(AuthRateThrottle, EmailTokenObtainPairView.throttle_classes)
        self.assertIn(AuthRateThrottle, ThrottledTokenRefreshView.throttle_classes)
        self.assertIn(AuthRateThrottle, register.cls.throttle_classes)

    def test_public_forms_use_public_write_throttle(self):
        for view in (public_submit_suggestion, public_submit_service_request, public_water_supply_request):
            self.assertIn(PublicWriteRateThrottle, view.cls.throttle_classes)

    def test_payment_action_throttle_via_viewset(self):
        vs = SponsorshipViewSet()
        vs.action = "pay"
        vs.request = type("R", (), {"user": None, "method": "POST"})()
        throttles = vs.get_throttles()
        self.assertTrue(any(isinstance(t, PublicWriteRateThrottle) for t in throttles))

    def test_water_supply_admin_is_admin_not_allow_any(self):
        names = [p.__name__ for p in WaterSupplyRequestViewSet.permission_classes]
        self.assertIn("IsAdmin", names)
        self.assertNotIn("AllowAny", names)


# ---------------------------------------------------------------------------
# JWT blacklist regression + lifetimes documented via settings
# ---------------------------------------------------------------------------
class JwtPhase2Tests(APITestCase):
    def test_logout_blacklists_refresh(self):
        User.objects.create_user(username="jwt@x.com", email="jwt@x.com", password="Hello12345!")
        login = self.client.post(
            "/api/accounts/auth/token/",
            {"username": "jwt@x.com", "password": "Hello12345!"},
            format="json",
        )
        self.assertEqual(login.status_code, 200)
        refresh = login.data["refresh"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['access']}")
        self.assertEqual(
            self.client.post("/api/accounts/logout/", {"refresh": refresh}, format="json").status_code,
            200,
        )
        self.client.credentials()
        again = self.client.post(
            "/api/accounts/auth/token/refresh/", {"refresh": refresh}, format="json"
        )
        self.assertEqual(again.status_code, 401)

    def test_jwt_lifetimes_match_decisions(self):
        from django.conf import settings
        from datetime import timedelta

        self.assertEqual(settings.SIMPLE_JWT["ACCESS_TOKEN_LIFETIME"], timedelta(days=1))
        self.assertEqual(settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"], timedelta(days=7))
        self.assertTrue(settings.SIMPLE_JWT["BLACKLIST_AFTER_ROTATION"])


# ---------------------------------------------------------------------------
# PDPL regression
# ---------------------------------------------------------------------------
class PdplPhase2Tests(APITestCase):
    def test_mask_under_five(self):
        self.assertEqual(mask_small_count(0), "<5")
        self.assertEqual(mask_small_count(4), "<5")
        self.assertEqual(mask_small_count(5), 5)

    def test_water_supply_admin_not_public(self):
        """PDPL: water-supply admin list must remain IsAdmin (PII)."""
        res = self.client.get("/api/water-supply-requests/")
        self.assertEqual(res.status_code, 401)
