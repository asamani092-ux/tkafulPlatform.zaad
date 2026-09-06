"""E2E ثنائي الإعداد — زاد مقابل تصدير بمال ومتبرّع."""
from decimal import Decimal

from django.contrib.auth.models import User
from django.core.management import call_command
from rest_framework.test import APITestCase

from core.models import PlatformSetting
from core.runtime_config import clear_runtime_config_cache, payments_enabled, role_can_login
from sponsorships.models import Payment, Sponsorship, SponsorshipStatus
from sponsorships.services import PaymentError, record_payment
from sponsorships.status_catalog import seed_sponsorship_statuses


def _user(email, role, password="Pass12345!"):
    u = User.objects.create_user(username=email, email=email, password=password)
    u.profile.role = role
    u.profile.save()
    return u


class ZaadConfigE2ETests(APITestCase):
    """E2E1: إعداد زاد — عيني، متجر خارجي، تسجيل مشرف، حالات مخصّصة، عدّ، بلا مال/PII زائد."""

    def setUp(self):
        call_command("seed_zaad_config")
        clear_runtime_config_cache()
        self.admin = _user("zaad-admin@e2e.com", "admin")
        self.donor = _user("zaad-donor@e2e.com", "donor")

    def test_zaad_seed_flags(self):
        s = PlatformSetting.load()
        self.assertFalse(s.sponsorship_payments_enabled)
        self.assertFalse(s.sponsorship_gps_documentation)
        self.assertEqual(s.sponsorship_collect_donor_data, "name_optional")
        self.assertFalse(role_can_login("donor"))
        self.assertTrue(role_can_login("admin"))
        active = set(
            SponsorshipStatus.objects.filter(is_active=True).values_list("slug", flat=True)
        )
        self.assertEqual(active, {"available", "sponsored", "prepared", "delivered"})

    def test_donor_login_blocked(self):
        res = self.client.post(
            "/api/accounts/auth/token/",
            {"username": "zaad-donor@e2e.com", "password": "Pass12345!"},
            format="json",
        )
        self.assertIn(res.status_code, (400, 401))
        self.assertNotIn("access", res.data if isinstance(res.data, dict) else {})

    def test_admin_records_community_units_no_money(self):
        self.client.force_authenticate(self.admin)
        res = self.client.post(
            "/api/saqya/sponsorships/",
            {
                "type": "كراتين 30",
                "kind": "community",
                "units_target": 30,
                "sponsor_name": "فاعل خير",
            },
            format="json",
        )
        self.assertEqual(res.status_code, 201, res.data)
        sp = Sponsorship.objects.get(pk=res.data["id"])
        self.assertIsNone(sp.amount)
        self.assertEqual(sp.total_funded, 0)
        self.assertEqual(sp.units_progress, {"completed": 0, "target": 30})
        self.assertEqual(sp.status, "available")
        from sponsorships.status_ops import set_sponsorship_status

        set_sponsorship_status(sp, "sponsored")
        sp.refresh_from_db()
        self.assertEqual(sp.status, "sponsored")
        with self.assertRaises(PaymentError):
            record_payment(
                sponsorship_id=sp.id,
                user=self.admin,
                user_role="admin",
                amount=Decimal("10"),
            )

    def test_public_stats_and_pii_gate(self):
        self.client.force_authenticate(self.admin)
        bad = self.client.post(
            "/api/saqya/sponsorships/",
            {"type": "x", "beneficiary_name": "شخص"},
            format="json",
        )
        self.assertEqual(bad.status_code, 400)
        for _ in range(2):
            Sponsorship.objects.create(type="z", status="available")
        stats = self.client.get("/api/saqya/public-stats/")
        self.assertEqual(stats.status_code, 200)
        self.assertEqual(stats.data["total"], "<5")


class ExportConfigE2ETests(APITestCase):
    """E2E2: إعداد بديل — مدفوعات On + دخول متبرّع — نفس الكود يدعم مالاً."""

    def setUp(self):
        seed_sponsorship_statuses(model=SponsorshipStatus)
        s = PlatformSetting.load()
        roles = dict(s.roles_can_login or {})
        roles["donor"] = True
        s.roles_can_login = roles
        s.sponsorship_payments_enabled = True
        s.sponsorship_collect_donor_data = PlatformSetting.DONOR_DATA_FULL
        s.save()
        clear_runtime_config_cache()
        self.assertTrue(payments_enabled())
        self.donor = _user("export-donor@e2e.com", "donor")

    def test_donor_login_and_pay_flow(self):
        res = self.client.post(
            "/api/accounts/auth/token/",
            {"username": "export-donor@e2e.com", "password": "Pass12345!"},
            format="json",
        )
        self.assertEqual(res.status_code, 200, res.data)
        self.assertIn("access", res.data)

        self.client.force_authenticate(self.donor)
        create = self.client.post(
            "/api/saqya/sponsorships/",
            {"type": "سقيا", "amount": "100.00", "sponsor_name": "متبرّع"},
            format="json",
        )
        self.assertEqual(create.status_code, 201, create.data)
        sp_id = create.data["id"]

        over = self.client.post(
            f"/api/saqya/sponsorships/{sp_id}/pay/",
            {"amount": "150", "method": "online"},
            format="json",
        )
        self.assertEqual(over.status_code, 400)

        full = self.client.post(
            f"/api/saqya/sponsorships/{sp_id}/pay/",
            {"amount": "100", "method": "online"},
            format="json",
        )
        self.assertEqual(full.status_code, 201, full.data)
        self.assertEqual(Payment.objects.filter(sponsorship_id=sp_id, status="completed").count(), 1)
        sp = Sponsorship.objects.get(pk=sp_id)
        self.assertEqual(float(sp.total_funded), 100.0)
        self.assertIn(sp.status, ("sponsored", "in_progress", "available"))
