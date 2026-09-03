"""فرض نطاق المورّد/المندوب عند الإسناد — بوابة المرحلة 2."""
from django.contrib.auth.models import User
from rest_framework.test import APITestCase

from projects.models import Project, ProjectAllowedSupplier, ProjectAllowedRepresentative
from .models import Sponsorship, Order, SupplierProfile, RepresentativeProfile


def make_user(email, role):
    u = User.objects.create_user(username=email, email=email, password="Hello12345!")
    u.profile.role = role
    u.profile.save()
    return u


class AssignAllowlistTests(APITestCase):
    def setUp(self):
        self.admin = make_user("admin@a.com", "admin")
        self.donor = make_user("donor@a.com", "donor")
        self.sup_ok = make_user("supok@a.com", "supplier")
        self.sup_bad = make_user("supbad@a.com", "supplier")
        self.rep_ok = make_user("repok@a.com", "representative")
        self.rep_bad = make_user("repbad@a.com", "representative")
        SupplierProfile.objects.create(user=self.sup_ok, business_name="مسموح")
        SupplierProfile.objects.create(user=self.sup_bad, business_name="مرفوض")
        RepresentativeProfile.objects.create(user=self.rep_ok, area="أ")
        RepresentativeProfile.objects.create(user=self.rep_bad, area="ب")
        self.project = Project.objects.create(name="سقيا", slug="saqya-allow")
        self.client.force_authenticate(self.donor)
        res = self.client.post(
            "/api/saqya/sponsorships/",
            {"amount": "100", "type": "سقيا", "beneficiaries_count": 1, "project": self.project.slug},
            format="json",
        )
        self.assertEqual(res.status_code, 201, res.data)
        self.sp_id = res.data["id"]
        self.client.force_authenticate(self.admin)
        self.client.post(f"/api/saqya/sponsorships/{self.sp_id}/approve/", {}, format="json")
        self.order = Order.objects.get(sponsorship_id=self.sp_id)

    def test_empty_allowlist_allows_any(self):
        res = self.client.post(
            f"/api/saqya/orders/{self.order.id}/assign/",
            {"supplier_id": self.sup_bad.id, "representative_id": self.rep_bad.id},
            format="json",
        )
        self.assertEqual(res.status_code, 200, res.data)

    def test_nonempty_allowlist_rejects_outsiders(self):
        ProjectAllowedSupplier.objects.create(project=self.project, user=self.sup_ok)
        ProjectAllowedRepresentative.objects.create(project=self.project, user=self.rep_ok)
        bad = self.client.post(
            f"/api/saqya/orders/{self.order.id}/assign/",
            {"supplier_id": self.sup_bad.id, "representative_id": self.rep_ok.id},
            format="json",
        )
        self.assertEqual(bad.status_code, 400)
        ok = self.client.post(
            f"/api/saqya/orders/{self.order.id}/assign/",
            {"supplier_id": self.sup_ok.id, "representative_id": self.rep_ok.id},
            format="json",
        )
        self.assertEqual(ok.status_code, 200, ok.data)
