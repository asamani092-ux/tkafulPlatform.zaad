"""
اختبار تكامل طرف-إلى-طرف لنظام التحكم بالكفالات (المرحلة 3).
المسار: نوع → إنشاء كفالة بحقول → اعتماد → إسناد مسموح → دورة الطلب → رفض تجاوز التمويل.
"""
from django.contrib.auth.models import User
from rest_framework.test import APITestCase

from projects.models import Project, ProjectAllowedRepresentative, ProjectAllowedSupplier
from .models import (
    Order,
    Payment,
    RepresentativeProfile,
    Sponsorship,
    SponsorshipType,
    SupplierProfile,
)


def make_user(email: str, role: str) -> User:
    u = User.objects.create_user(username=email, email=email, password="Hello12345!")
    u.profile.role = role
    u.profile.save()
    return u


class SponsorshipControlE2ETests(APITestCase):
    def setUp(self):
        self.admin = make_user("admin-e2e@t.com", "admin")
        self.donor = make_user("donor-e2e@t.com", "donor")
        self.sup_ok = make_user("sup-ok-e2e@t.com", "supplier")
        self.sup_bad = make_user("sup-bad-e2e@t.com", "supplier")
        self.rep_ok = make_user("rep-ok-e2e@t.com", "representative")
        SupplierProfile.objects.create(user=self.sup_ok, business_name="مورّد مسموح")
        SupplierProfile.objects.create(user=self.sup_bad, business_name="مورّد خارج النطاق")
        RepresentativeProfile.objects.create(user=self.rep_ok, area="شمال")
        self.project = Project.objects.create(name="سقيا تكامل", slug="saqya-e2e")
        ProjectAllowedSupplier.objects.create(project=self.project, user=self.sup_ok)
        ProjectAllowedRepresentative.objects.create(project=self.project, user=self.rep_ok)

    def test_full_control_cycle(self):
        self.client.force_authenticate(self.admin)
        type_res = self.client.post(
            "/api/saqya/sponsorship-types/",
            {
                "project": self.project.slug,
                "name": "سقيا منزلية",
                "description": "نوع تجريبي",
                "fields": [
                    {"key": "tanks", "label": "عدد الخزانات", "type": "number", "required": True},
                    {
                        "key": "note",
                        "label": "ملاحظة",
                        "type": "text",
                        "required": False,
                        "is_public": True,
                    },
                ],
            },
            format="json",
        )
        self.assertEqual(type_res.status_code, 201, type_res.data)
        stype_id = type_res.data["id"]
        self.assertTrue(type_res.data.get("slug"))
        self.assertTrue(SponsorshipType.objects.filter(pk=stype_id).exists())

        self.client.force_authenticate(self.donor)
        create_res = self.client.post(
            "/api/saqya/sponsorships/",
            {
                "amount": "1000.00",
                "sponsorship_type": stype_id,
                "type_data": {"tanks": 3, "note": "حيّ النور"},
                "beneficiaries_count": 5,
                "location": "الرياض",
                "description": "كفالة تكامل",
            },
            format="json",
        )
        self.assertEqual(create_res.status_code, 201, create_res.data)
        sp_id = create_res.data["id"]
        sp = Sponsorship.objects.get(pk=sp_id)
        self.assertEqual(sp.type, "سقيا منزلية")
        self.assertEqual(sp.project_id, self.project.id)
        self.assertEqual(sp.type_data.get("tanks"), 3.0)

        self.client.force_authenticate(self.admin)
        apr = self.client.post(f"/api/saqya/sponsorships/{sp_id}/approve/", {}, format="json")
        self.assertEqual(apr.status_code, 200, apr.data)
        order = Order.objects.get(sponsorship_id=sp_id)
        self.assertEqual(order.status, "pending")

        bad = self.client.post(
            f"/api/saqya/orders/{order.id}/assign/",
            {"supplier_id": self.sup_bad.id, "representative_id": self.rep_ok.id},
            format="json",
        )
        self.assertEqual(bad.status_code, 400)

        ok_assign = self.client.post(
            f"/api/saqya/orders/{order.id}/assign/",
            {"supplier_id": self.sup_ok.id, "representative_id": self.rep_ok.id},
            format="json",
        )
        self.assertEqual(ok_assign.status_code, 200, ok_assign.data)
        order.refresh_from_db()
        self.assertEqual(order.status, "assigned")

        for action, expected in (
            ("prepare", "preparing"),
            ("ready", "ready"),
            ("deliver", "delivered"),
            ("complete", "completed"),
        ):
            res = self.client.post(f"/api/saqya/orders/{order.id}/{action}/", {}, format="json")
            self.assertEqual(res.status_code, 200, f"{action}: {res.data}")
            order.refresh_from_db()
            self.assertEqual(order.status, expected)

        sp.refresh_from_db()
        self.assertEqual(sp.status, "completed")

        self.client.force_authenticate(self.donor)
        sp2 = self.client.post(
            "/api/saqya/sponsorships/",
            {"amount": "100.00", "type": "سقيا", "beneficiaries_count": 1},
            format="json",
        )
        self.assertEqual(sp2.status_code, 201, sp2.data)
        sp2_id = sp2.data["id"]
        over = self.client.post(
            f"/api/saqya/sponsorships/{sp2_id}/pay/",
            {"amount": "150", "method": "online"},
            format="json",
        )
        self.assertEqual(over.status_code, 400)
        full = self.client.post(
            f"/api/saqya/sponsorships/{sp2_id}/pay/",
            {"amount": "100", "method": "online"},
            format="json",
        )
        self.assertEqual(full.status_code, 201, full.data)
        extra = self.client.post(
            f"/api/saqya/sponsorships/{sp2_id}/pay/",
            {"amount": "1", "method": "online"},
            format="json",
        )
        self.assertEqual(extra.status_code, 400)
        self.assertEqual(Payment.objects.filter(sponsorship_id=sp2_id, status="completed").count(), 1)
        self.assertEqual(float(Sponsorship.objects.get(pk=sp2_id).total_funded), 100.0)
