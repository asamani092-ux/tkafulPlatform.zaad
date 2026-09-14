"""اختبارات المرحلة 1 — تهيئة الكفالة (مال/عيني + حالات + عدّ مجتمعي)."""
from decimal import Decimal

from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.test import APITestCase

from core.models import PlatformSetting
from core.runtime_config import clear_runtime_config_cache, payments_enabled
from sponsorships.models import Sponsorship, SponsorshipStatus
from sponsorships.services import PaymentError, record_payment
from sponsorships.status_catalog import STATUS_BACKFILL_MAP, seed_sponsorship_statuses


def _user(email, role, password="Pass12345!"):
    u = User.objects.create_user(username=email, email=email, password=password)
    u.profile.role = role
    u.profile.save()
    return u


class ConfigurableSponsorshipModelTests(TestCase):
    def setUp(self):
        seed_sponsorship_statuses(model=SponsorshipStatus)
        self.donor = _user("don@t.com", "donor")
        clear_runtime_config_cache()
        PlatformSetting.load()

    def test_zaad_defaults_payments_off(self):
        s = PlatformSetting.load()
        self.assertFalse(s.sponsorship_payments_enabled)
        self.assertFalse(s.sponsorship_gps_documentation)
        self.assertEqual(s.sponsorship_collect_donor_data, "name_optional")
        self.assertFalse(payments_enabled())

    def test_statuses_seeded(self):
        active = set(
            SponsorshipStatus.objects.filter(is_active=True).values_list("slug", flat=True)
        )
        self.assertEqual(active, {"available", "sponsored", "prepared", "delivered"})

    def test_amount_optional_in_kind(self):
        sp = Sponsorship.objects.create(
            type="ثلاجة",
            sponsor_name="فاعل خير",
            kind=Sponsorship.KIND_INDIVIDUAL,
            status="available",
            amount=None,
        )
        self.assertIsNone(sp.amount)
        self.assertEqual(sp.total_funded, 0)
        self.assertIsNone(sp.remaining)
        self.assertFalse(sp.is_fully_funded)

    def test_community_units_progress(self):
        sp = Sponsorship.objects.create(
            type="كراتين",
            kind=Sponsorship.KIND_COMMUNITY,
            units_target=20,
            units_completed=7,
            status="sponsored",
        )
        self.assertEqual(sp.units_progress, {"completed": 7, "target": 20})

    def test_payment_rejected_when_disabled(self):
        sp = Sponsorship.objects.create(
            donor=self.donor,
            type="سقيا",
            amount=Decimal("100.00"),
            status="sponsored",
        )
        with self.assertRaises(PaymentError) as ctx:
            record_payment(
                sponsorship_id=sp.id,
                user=self.donor,
                user_role="donor",
                amount=Decimal("10"),
            )
        self.assertEqual(ctx.exception.status_code, 403)

    def test_payment_and_overfund_when_enabled(self):
        s = PlatformSetting.load()
        s.sponsorship_payments_enabled = True
        s.save()
        clear_runtime_config_cache()
        self.assertTrue(payments_enabled())
        sp = Sponsorship.objects.create(
            donor=self.donor,
            type="سقيا",
            amount=Decimal("100.00"),
            status="sponsored",
        )
        record_payment(
            sponsorship_id=sp.id,
            user=self.donor,
            user_role="donor",
            amount=Decimal("100"),
        )
        sp.refresh_from_db()
        self.assertEqual(float(sp.total_funded), 100.0)
        with self.assertRaises(PaymentError):
            record_payment(
                sponsorship_id=sp.id,
                user=self.donor,
                user_role="donor",
                amount=Decimal("1"),
            )


class StatusBackfillIntegrityTests(TestCase):
    def test_backfill_preserves_count(self):
        seed_sponsorship_statuses(model=SponsorshipStatus)
        for st in ("pending", "approved", "in_progress", "completed"):
            Sponsorship.objects.create(type="x", status=st, amount=Decimal("1"))
        before = Sponsorship.objects.count()
        by_slug = {s.slug: s for s in SponsorshipStatus.objects.all()}
        for sp in Sponsorship.objects.all():
            new_slug = STATUS_BACKFILL_MAP.get(sp.status, "available")
            sp.status = new_slug
            sp.status_ref = by_slug.get(new_slug)
            sp.save(update_fields=["status", "status_ref"])
        self.assertEqual(Sponsorship.objects.count(), before)
        self.assertTrue(Sponsorship.objects.filter(status="available").exists())
        self.assertTrue(Sponsorship.objects.filter(status="delivered").exists())


class ConfigurableSettingsAPITests(APITestCase):
    def setUp(self):
        self.admin = _user("adm2@t.com", "admin")
        clear_runtime_config_cache()
        PlatformSetting.load()

    def test_public_settings_expose_config_block(self):
        res = self.client.get("/api/public-settings/")
        self.assertEqual(res.status_code, 200)
        for key in (
            "roles_can_login",
            "sponsorship_payments_enabled",
            "sponsorship_gps_documentation",
            "sponsorship_collect_donor_data",
        ):
            self.assertIn(key, res.data)
        self.assertFalse(res.data["sponsorship_payments_enabled"])
        self.assertFalse(res.data["roles_can_login"]["donor"])

    def test_admin_can_toggle_payments(self):
        self.client.force_authenticate(self.admin)
        res = self.client.patch(
            "/api/settings/",
            {"sponsorship_payments_enabled": True},
            format="json",
        )
        self.assertEqual(res.status_code, 200, res.data)
        self.assertTrue(res.data["sponsorship_payments_enabled"])
        clear_runtime_config_cache()
        self.assertTrue(payments_enabled())
