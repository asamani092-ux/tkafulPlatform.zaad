"""Phase 2 — قائمة الكفالات بلا N+1 على total_funded."""
from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.test import APITestCase

from .models import Payment, Sponsorship
from .views import annotate_sponsorship_funding


def make_user(email, role):
    u = User.objects.create_user(username=email, email=email, password="Hello12345!")
    u.profile.role = role
    u.profile.save()
    return u


class SponsorshipFundingAnnotateTests(APITestCase):
    def setUp(self):
        from core.models import PlatformSetting
        from core.runtime_config import clear_runtime_config_cache
        s = PlatformSetting.load()
        s.sponsorship_payments_enabled = True
        s.save()
        clear_runtime_config_cache()
        self.admin = make_user("admin@n1.com", "admin")
        self.donor = make_user("donor@n1.com", "donor")

    def test_list_funding_is_constant_queries(self):
        n = 8
        expected = {}
        for i in range(n):
            sp = Sponsorship.objects.create(
                donor=self.donor, amount=1000, type="سقيا", status="pending"
            )
            Payment.objects.create(
                sponsorship=sp, amount=100 + i, status="completed", method="online"
            )
            Payment.objects.create(
                sponsorship=sp, amount=50, status="pending", method="online"
            )
            expected[sp.id] = float(100 + i)

        self.client.force_authenticate(self.admin)
        # قائمة + قراءة PlatformSetting مرة واحدة (بوابة المدفوعات) — ثابت لا يتصاعد مع N.
        with self.assertNumQueries(2):
            res = self.client.get("/api/saqya/sponsorships/")
        self.assertEqual(res.status_code, 200)
        results = res.data["results"] if isinstance(res.data, dict) and "results" in res.data else res.data
        self.assertEqual(len(results), n)
        by_id = {row["id"]: row for row in results}
        for sid, funded in expected.items():
            self.assertEqual(by_id[sid]["total_funded"], funded)


class AnnotateHelperUnitTests(TestCase):
    def setUp(self):
        from core.models import PlatformSetting
        from core.runtime_config import clear_runtime_config_cache
        s = PlatformSetting.load()
        s.sponsorship_payments_enabled = True
        s.save()
        clear_runtime_config_cache()

    def test_annotate_matches_property(self):
        donor = make_user("d2@n1.com", "donor")
        sp = Sponsorship.objects.create(donor=donor, amount=500, type="سقيا")
        Payment.objects.create(sponsorship=sp, amount=200, status="completed", method="online")
        Payment.objects.create(sponsorship=sp, amount=99, status="failed", method="online")
        annotated = annotate_sponsorship_funding(Sponsorship.objects.filter(pk=sp.pk)).get()
        self.assertEqual(float(annotated._total_funded), 200.0)
        self.assertEqual(float(annotated.total_funded), 200.0)
