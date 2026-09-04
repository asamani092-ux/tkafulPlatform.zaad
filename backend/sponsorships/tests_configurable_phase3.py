"""اختبارات المرحلة 3 — استقبال كفالة + متجر خارجي + خصوصية."""
from decimal import Decimal

from django.contrib.auth.models import User
from rest_framework.test import APITestCase

from core.models import PlatformSetting
from core.runtime_config import clear_runtime_config_cache
from sponsorships.models import Sponsorship


def _user(email, role, password="Pass12345!"):
    u = User.objects.create_user(username=email, email=email, password=password)
    u.profile.role = role
    u.profile.save()
    return u


class IntakePrivacyTests(APITestCase):
    def setUp(self):
        clear_runtime_config_cache()
        self.admin = _user("adm3@t.com", "admin")
        s = PlatformSetting.load()
        s.sponsorship_payments_enabled = False
        s.sponsorship_collect_donor_data = PlatformSetting.DONOR_DATA_NAME_OPTIONAL
        s.save()
        clear_runtime_config_cache()

    def test_admin_can_record_inkind_sponsorship(self):
        self.client.force_authenticate(self.admin)
        res = self.client.post(
            "/api/saqya/sponsorships/",
            {
                "type": "ثلاجة",
                "kind": "individual",
                "sponsor_name": "فاعل خير",
            },
            format="json",
        )
        self.assertEqual(res.status_code, 201, res.data)
        sp = Sponsorship.objects.get(pk=res.data["id"])
        self.assertIsNone(sp.donor_id)
        self.assertEqual(sp.sponsor_name, "فاعل خير")
        self.assertIsNone(sp.amount)

    def test_policy_none_rejects_sponsor_name(self):
        s = PlatformSetting.load()
        s.sponsorship_collect_donor_data = PlatformSetting.DONOR_DATA_NONE
        s.save()
        clear_runtime_config_cache()
        self.client.force_authenticate(self.admin)
        res = self.client.post(
            "/api/saqya/sponsorships/",
            {"type": "كراتين", "sponsor_name": "اسم"},
            format="json",
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn("sponsor_name", res.data)

    def test_beneficiary_pii_rejected(self):
        self.client.force_authenticate(self.admin)
        res = self.client.post(
            "/api/saqya/sponsorships/",
            {
                "type": "سقيا",
                "beneficiary_name": "مستفيد",
                "beneficiary_phone": "0500000000",
            },
            format="json",
        )
        self.assertEqual(res.status_code, 400)

    def test_community_units_without_money(self):
        self.client.force_authenticate(self.admin)
        res = self.client.post(
            "/api/saqya/sponsorships/",
            {
                "type": "كراتين",
                "kind": "community",
                "units_target": 30,
            },
            format="json",
        )
        self.assertEqual(res.status_code, 201, res.data)
        sp = Sponsorship.objects.get(pk=res.data["id"])
        self.assertEqual(sp.units_target, 30)
        self.assertEqual(sp.total_funded, 0)

    def test_public_stats_mask_small_counts(self):
        for i in range(3):
            Sponsorship.objects.create(type="x", status="available", amount=None)
        res = self.client.get("/api/saqya/public-stats/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["total"], "<5")
        self.assertEqual(res.data["available"], "<5")

    def test_public_stats_unmasked_when_ge_5(self):
        for i in range(5):
            Sponsorship.objects.create(type="y", status="sponsored", amount=None)
        res = self.client.get("/api/saqya/public-stats/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["total"], 5)
        self.assertEqual(res.data["sponsored"], 5)
