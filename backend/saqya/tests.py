from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APITestCase

from notifications.models import Notification
from .models import Sponsorship, Order, Documentation


def make_user(email, role):
    u = User.objects.create_user(username=email, email=email, password="Hello12345!")
    u.profile.role = role
    u.profile.save()
    return u


class SaqyaWorkflowTests(APITestCase):
    def setUp(self):
        self.admin = make_user("admin@s.com", "admin")
        self.donor = make_user("donor@s.com", "donor")
        self.donor2 = make_user("donor2@s.com", "donor")
        self.supplier = make_user("supplier@s.com", "supplier")
        self.rep = make_user("rep@s.com", "representative")

    def _create_sponsorship(self, amount="1000.00"):
        self.client.force_authenticate(self.donor)
        res = self.client.post("/api/saqya/sponsorships/",
                               {"amount": amount, "type": "سقيا", "beneficiaries_count": 5}, format="json")
        return res

    def test_donor_creates_sponsorship_others_cannot(self):
        res = self._create_sponsorship()
        self.assertEqual(res.status_code, 201)
        self.client.force_authenticate(self.supplier)
        res2 = self.client.post("/api/saqya/sponsorships/", {"amount": "10", "type": "x"}, format="json")
        self.assertEqual(res2.status_code, 403)

    def test_admin_approve_creates_order(self):
        sp_id = self._create_sponsorship().data["id"]
        self.client.force_authenticate(self.admin)
        res = self.client.post(f"/api/saqya/sponsorships/{sp_id}/approve/", {}, format="json")
        self.assertEqual(res.status_code, 200)
        sp = Sponsorship.objects.get(pk=sp_id)
        self.assertEqual(sp.status, "approved")
        self.assertEqual(Order.objects.filter(sponsorship=sp).count(), 1)

    def test_overfunding_prevented_and_autostatus(self):
        sp_id = self._create_sponsorship("1000.00").data["id"]
        self.client.force_authenticate(self.donor)
        # دفعة تتجاوز المبلغ -> مرفوضة
        over = self.client.post(f"/api/saqya/sponsorships/{sp_id}/pay/", {"amount": "1500", "method": "online"}, format="json")
        self.assertEqual(over.status_code, 400)
        # دفعة كاملة -> الحالة in_progress
        full = self.client.post(f"/api/saqya/sponsorships/{sp_id}/pay/", {"amount": "1000", "method": "online"}, format="json")
        self.assertEqual(full.status_code, 201)
        sp = Sponsorship.objects.get(pk=sp_id)
        self.assertEqual(float(sp.total_funded), 1000.0)
        self.assertEqual(sp.status, "in_progress")
        # دفعة إضافية بعد الاكتمال -> مرفوضة (تمويل زائد)
        extra = self.client.post(f"/api/saqya/sponsorships/{sp_id}/pay/", {"amount": "1", "method": "online"}, format="json")
        self.assertEqual(extra.status_code, 400)

    def test_donor_queryset_isolation(self):
        self._create_sponsorship()  # donor
        self.client.force_authenticate(self.donor2)
        res = self.client.get("/api/saqya/sponsorships/")
        self.assertEqual(res.status_code, 200)
        results = res.data["results"] if isinstance(res.data, dict) and "results" in res.data else res.data
        self.assertEqual(len(results), 0)  # donor2 يرى كفالاته فقط (لا شيء)

    def test_private_documentation_access_control(self):
        sp_id = self._create_sponsorship().data["id"]
        self.client.force_authenticate(self.admin)
        self.client.post(f"/api/saqya/sponsorships/{sp_id}/approve/", {}, format="json")
        order = Order.objects.filter(sponsorship_id=sp_id).first()
        order.representative = self.rep
        order.save()
        # المندوب يرفع توثيقاً مع ملف
        self.client.force_authenticate(self.rep)
        f = SimpleUploadedFile("photo.jpg", b"binarydata", content_type="image/jpeg")
        up = self.client.post("/api/saqya/documentation/",
                              {"order": order.id, "type": "photo", "file": f}, format="multipart")
        self.assertEqual(up.status_code, 201)
        doc = Documentation.objects.get(pk=up.data["id"])
        # مستخدم آخر (متبرّع غير صاحب الكفالة) لا يصل للملف
        self.client.force_authenticate(self.donor2)
        denied = self.client.get(f"/api/saqya/documentation/{doc.id}/file/")
        self.assertEqual(denied.status_code, 403)
        # صاحب الكفالة (المتبرّع) يصل
        self.client.force_authenticate(self.donor)
        ok = self.client.get(f"/api/saqya/documentation/{doc.id}/file/")
        self.assertEqual(ok.status_code, 200)

    def test_documentation_approve_notifies_donor(self):
        sp_id = self._create_sponsorship().data["id"]
        self.client.force_authenticate(self.admin)
        self.client.post(f"/api/saqya/sponsorships/{sp_id}/approve/", {}, format="json")
        order = Order.objects.filter(sponsorship_id=sp_id).first()
        order.representative = self.rep
        order.save()
        self.client.force_authenticate(self.rep)
        f = SimpleUploadedFile("p.jpg", b"x", content_type="image/jpeg")
        doc_id = self.client.post("/api/saqya/documentation/",
                                  {"order": order.id, "type": "photo", "file": f}, format="multipart").data["id"]
        before = Notification.objects.filter(user=self.donor).count()
        self.client.force_authenticate(self.admin)
        res = self.client.post(f"/api/saqya/documentation/{doc_id}/approve/", {}, format="json")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(Notification.objects.filter(user=self.donor).count(), before + 1)
