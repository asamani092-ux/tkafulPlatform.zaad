"""
Security regression tests: IDOR, media access, uploads, GPS, throttling, payments.
"""
import threading
import unittest

from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from django.db import connection
from django.test import TransactionTestCase, override_settings
from rest_framework.test import APITestCase

from saqya.models import Sponsorship, Order, Invoice, Documentation, Payment


def make_user(email, role):
    u = User.objects.create_user(username=email, email=email, password="Hello12345!")
    u.profile.role = role
    u.profile.save()
    return u


class IdorSecurityTests(APITestCase):
    def setUp(self):
        self.donor_a = make_user("da@x.com", "donor")
        self.donor_b = make_user("db@x.com", "donor")
        self.supplier = make_user("sup@x.com", "supplier")
        self.admin = make_user("adm@x.com", "admin")

        self.client.force_authenticate(self.donor_a)
        sp = self.client.post("/api/saqya/sponsorships/", {"amount": "500", "type": "سقيا"}, format="json")
        self.sp_a_id = sp.data["id"]

        self.client.force_authenticate(self.admin)
        self.client.post(f"/api/saqya/sponsorships/{self.sp_a_id}/approve/", {}, format="json")
        self.order = Order.objects.get(sponsorship_id=self.sp_a_id)
        self.order.supplier = self.supplier
        self.order.save()

        self.client.force_authenticate(self.supplier)
        inv = self.client.post("/api/saqya/invoices/", {
            "order": self.order.id,
            "invoice_number": "INV-001",
            "amount": "100",
            "total_amount": "100",
        }, format="json")
        self.invoice_id = inv.data["id"]

        self.client.force_authenticate(self.supplier)
        doc = self.client.post("/api/saqya/documentation/", {
            "order": self.order.id,
            "type": "photo",
            "file": SimpleUploadedFile("p.jpg", b"x", content_type="image/jpeg"),
        }, format="multipart")
        self.doc_id = doc.data["id"]

    def test_donor_b_cannot_access_donor_a_sponsorship_detail(self):
        self.client.force_authenticate(self.donor_b)
        res = self.client.get(f"/api/saqya/sponsorships/{self.sp_a_id}/")
        self.assertIn(res.status_code, (403, 404))

    def test_donor_b_cannot_access_donor_a_order(self):
        self.client.force_authenticate(self.donor_b)
        res = self.client.get(f"/api/saqya/orders/{self.order.id}/")
        self.assertIn(res.status_code, (403, 404))

    def test_donor_b_cannot_access_donor_a_invoice(self):
        self.client.force_authenticate(self.donor_b)
        res = self.client.get(f"/api/saqya/invoices/{self.invoice_id}/")
        self.assertIn(res.status_code, (403, 404))

    def test_donor_b_cannot_access_donor_a_documentation(self):
        self.client.force_authenticate(self.donor_b)
        res = self.client.get(f"/api/saqya/documentation/{self.doc_id}/")
        self.assertIn(res.status_code, (403, 404))


class PrivateMediaSecurityTests(APITestCase):
    def setUp(self):
        self.donor = make_user("d@x.com", "donor")
        self.other = make_user("o@x.com", "donor")
        self.client.force_authenticate(self.donor)
        sp_id = self.client.post("/api/saqya/sponsorships/", {"amount": "200", "type": "سقيا"}, format="json").data["id"]
        admin = make_user("a@x.com", "admin")
        self.client.force_authenticate(admin)
        self.client.post(f"/api/saqya/sponsorships/{sp_id}/approve/", {}, format="json")
        order = Order.objects.get(sponsorship_id=sp_id)
        supplier = make_user("s@x.com", "supplier")
        order.supplier = supplier
        order.save()
        self.client.force_authenticate(supplier)
        inv = self.client.post("/api/saqya/invoices/", {
            "order": order.id, "invoice_number": "INV-X", "amount": "50", "total_amount": "50",
            "file": SimpleUploadedFile("inv.pdf", b"%PDF", content_type="application/pdf"),
        }, format="multipart")
        self.invoice_id = inv.data["id"]

    def test_anonymous_rejected_from_invoice_file(self):
        self.client.force_authenticate(user=None)
        res = self.client.get(f"/api/saqya/invoices/{self.invoice_id}/file/")
        self.assertEqual(res.status_code, 401)

    def test_wrong_donor_rejected_from_invoice_file(self):
        self.client.force_authenticate(self.other)
        res = self.client.get(f"/api/saqya/invoices/{self.invoice_id}/file/")
        self.assertEqual(res.status_code, 403)


class ConcurrentPaymentTests(TransactionTestCase):
    def setUp(self):
        from rest_framework.test import APIClient
        self.client = APIClient()
        self.donor = make_user("pay@x.com", "donor")
        self.client.force_authenticate(self.donor)
        sp = self.client.post("/api/saqya/sponsorships/", {"amount": "100", "type": "سقيا"}, format="json")
        self.sp_id = sp.data["id"]

    def test_sequential_payments_do_not_overfund(self):
        """SQLite-safe: second sequential pay must be rejected after first succeeds."""
        first = self.client.post(
            f"/api/saqya/sponsorships/{self.sp_id}/pay/",
            {"amount": "60", "method": "online"},
            format="json",
        )
        second = self.client.post(
            f"/api/saqya/sponsorships/{self.sp_id}/pay/",
            {"amount": "60", "method": "online"},
            format="json",
        )
        self.assertEqual(first.status_code, 201)
        self.assertEqual(second.status_code, 400)
        sp = Sponsorship.objects.get(pk=self.sp_id)
        self.assertLessEqual(float(sp.total_funded), 100.0)

    @unittest.skipUnless(
        connection.vendor == "postgresql",
        "true concurrency requires PostgreSQL",
    )
    def test_concurrent_payments_do_not_overfund(self):
        barrier = threading.Barrier(2)
        results = []

        def pay(amount):
            from django.db import connection as db_connection
            from rest_framework.test import APIClient
            try:
                db_connection.close()
                c = APIClient()
                c.force_authenticate(self.donor)
                barrier.wait(timeout=5)
                status = c.post(
                    f"/api/saqya/sponsorships/{self.sp_id}/pay/",
                    {"amount": str(amount), "method": "online"},
                    format="json",
                ).status_code
                results.append(status)
            except Exception as exc:
                results.append(("error", repr(exc)))

        t1 = threading.Thread(target=pay, args=("60",))
        t2 = threading.Thread(target=pay, args=("60",))
        t1.start()
        t2.start()
        t1.join(timeout=10)
        t2.join(timeout=10)

        errors = [r for r in results if isinstance(r, tuple) and r[0] == "error"]
        self.assertEqual(errors, [], f"thread errors: {errors}")
        self.assertEqual(len(results), 2)
        self.assertEqual(sum(1 for s in results if s == 201), 1)
        self.assertEqual(sum(1 for s in results if s == 400), 1)
        sp = Sponsorship.objects.get(pk=self.sp_id)
        self.assertLessEqual(float(sp.total_funded), 100.0)


class UploadValidationTests(APITestCase):
    def setUp(self):
        self.rep = make_user("r@x.com", "representative")
        self.donor = make_user("d2@x.com", "donor")
        self.admin = make_user("adm2@x.com", "admin")
        self.client.force_authenticate(self.donor)
        sp_id = self.client.post("/api/saqya/sponsorships/", {"amount": "100", "type": "سقيا"}, format="json").data["id"]
        self.client.force_authenticate(self.admin)
        self.client.post(f"/api/saqya/sponsorships/{sp_id}/approve/", {}, format="json")
        self.order = Order.objects.get(sponsorship_id=sp_id)
        self.order.representative = self.rep
        self.order.save()

    def test_reject_executable_upload(self):
        self.client.force_authenticate(self.rep)
        bad = SimpleUploadedFile("malware.exe", b"MZ", content_type="application/octet-stream")
        res = self.client.post("/api/saqya/documentation/", {
            "order": self.order.id, "type": "document", "file": bad,
        }, format="multipart")
        self.assertEqual(res.status_code, 400)

    def test_reject_invalid_gps(self):
        self.client.force_authenticate(self.rep)
        f = SimpleUploadedFile("p.jpg", b"x", content_type="image/jpeg")
        res = self.client.post("/api/saqya/documentation/", {
            "order": self.order.id, "type": "photo", "file": f,
            "latitude": 999, "longitude": 0,
        }, format="multipart")
        self.assertEqual(res.status_code, 400)


@override_settings(
    CACHES={"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}},
)
class ThrottleSecurityTests(APITestCase):
    def setUp(self):
        from copy import deepcopy
        from django.conf import settings
        from rest_framework.settings import api_settings
        from django.core.cache import cache

        cache.clear()
        rf = deepcopy(settings.REST_FRAMEWORK)
        rates = dict(rf.get("DEFAULT_THROTTLE_RATES", {}))
        rates.update({"auth": "2/min", "public_write": "2/min"})
        rf["DEFAULT_THROTTLE_RATES"] = rates
        self._override = override_settings(REST_FRAMEWORK=rf)
        self._override.enable()
        api_settings.reload()
        self.addCleanup(self._override.disable)
        self.addCleanup(api_settings.reload)

    def test_auth_throttle_on_login(self):
        User.objects.create_user(username="t@x.com", email="t@x.com", password="Hello12345!")
        for _ in range(2):
            self.client.post("/api/accounts/auth/token/", {"username": "t@x.com", "password": "wrong"}, format="json")
        res = self.client.post("/api/accounts/auth/token/", {"username": "t@x.com", "password": "wrong"}, format="json")
        self.assertEqual(res.status_code, 429)

    def test_public_write_throttle_on_suggestion(self):
        for _ in range(2):
            self.client.post("/api/public-suggestions/", {"title": "t", "description": "d"}, format="json")
        res = self.client.post("/api/public-suggestions/", {"title": "t2", "description": "d2"}, format="json")
        self.assertEqual(res.status_code, 429)

    def test_auth_throttle_on_refresh(self):
        for _ in range(2):
            self.client.post("/api/accounts/auth/token/refresh/", {"refresh": "not-a-valid-token"}, format="json")
        res = self.client.post("/api/accounts/auth/token/refresh/", {"refresh": "not-a-valid-token"}, format="json")
        self.assertEqual(res.status_code, 429)
