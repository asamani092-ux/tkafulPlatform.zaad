"""
اختبارات مسار فرصة التطوع: OTP، تكرار الهوية+جوال، تأكيد مستخدم/ضيف، اعتماد بعد الانتهاء.
التعقيد: كل اختبار O(1) لعمليات قاعدة البيانات المحدودة.
"""
from datetime import timedelta

from django.contrib.auth.models import User
from django.core import mail
from django.utils import timezone
from rest_framework.test import APITestCase

from accounts.models import EmailOTP, Profile
from accounts.otp import request_otp, verify_otp
from projects.models import Project, ProjectTool
from volunteering.models import OpportunityRegistration, VolunteeringProfile
from volunteering import opportunity as opp


class OpportunityFlowTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_superuser(
            username="admin_opp", email="admin_opp@test.com", password="Pass12345!"
        )
        self.admin.profile.role = "admin"
        self.admin.profile.is_approved = True
        self.admin.profile.save()

        self.user = User.objects.create_user(
            username="vol_user", email="vol@test.com", password="Pass12345!"
        )
        self.user.profile.role = "user"
        self.user.profile.name = "متطوع مسجّل"
        self.user.profile.phone = "511111111"
        self.user.profile.national_id = "1111111111"
        self.user.profile.is_approved = True
        self.user.profile.save()

        self.project = Project.objects.create(
            name="فرصة اختبار",
            slug="opp-flow",
            description="وصف",
            status="active",
            is_active=True,
            created_by=self.admin,
            end_date=timezone.localdate() + timedelta(days=30),
        )
        ProjectTool.objects.create(
            project=self.project,
            tool_key="volunteering",
            is_enabled=True,
            config={
                "show_opportunities": True,
                "location": "الرياض",
                "requirements": "حضور",
                "estimated_hours": 4,
                "duration": "يوم",
            },
        )
        VolunteeringProfile.objects.create(
            project=self.project,
            location="الرياض",
            volunteer_status="ACTIVE",
            is_hidden=False,
        )

    def test_public_opportunity_detail(self):
        res = self.client.get("/api/projects/opp-flow/volunteer/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["slug"], "opp-flow")
        self.assertEqual(res.data["location"], "الرياض")

    def test_guest_register_requires_otp_and_blocks_duplicate(self):
        mail.outbox.clear()
        res = self.client.post(
            "/api/projects/opp-flow/volunteer/otp/",
            {"email": "guest1@test.com"},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        otp = EmailOTP.objects.filter(email="guest1@test.com", purpose=EmailOTP.PURPOSE_REGISTER).latest("created_at")
        payload = {
            "full_name": "زائر واحد",
            "email": "guest1@test.com",
            "phone": "522222222",
            "national_id": "2222222222",
            "city": "جدة",
            "otp": otp.code,
        }
        res = self.client.post("/api/projects/opp-flow/volunteer/register/", payload, format="json")
        self.assertEqual(res.status_code, 201, res.data)
        self.assertEqual(res.data["source"], "guest")
        self.assertEqual(res.data["status"], "confirmed")

        # OTP جديد للمحاولة الثانية
        request_otp("guest1@test.com", EmailOTP.PURPOSE_REGISTER)
        otp2 = EmailOTP.objects.filter(email="guest1@test.com", purpose=EmailOTP.PURPOSE_REGISTER).latest("created_at")
        payload["otp"] = otp2.code
        res2 = self.client.post("/api/projects/opp-flow/volunteer/register/", payload, format="json")
        self.assertEqual(res2.status_code, 400)

    def test_existing_user_confirm(self):
        self.client.force_authenticate(self.user)
        res = self.client.post("/api/projects/opp-flow/volunteer/confirm/", {}, format="json")
        self.assertEqual(res.status_code, 201, res.data)
        self.assertEqual(res.data["source"], "existing_user")
        self.assertEqual(res.data["national_id"], "1111111111")

    def test_login_otp_gates_jwt(self):
        mail.outbox.clear()
        res = self.client.post(
            "/api/accounts/auth/otp/request/",
            {"email": "vol@test.com", "password": "Pass12345!"},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.data.get("otp_required"))
        self.assertFalse("access" in res.data)

        otp = EmailOTP.objects.filter(email="vol@test.com", purpose=EmailOTP.PURPOSE_LOGIN).latest("created_at")
        res2 = self.client.post(
            "/api/accounts/auth/otp/verify/",
            {"email": "vol@test.com", "password": "Pass12345!", "otp": otp.code},
            format="json",
        )
        self.assertEqual(res2.status_code, 200, res2.data)
        self.assertIn("access", res2.data)

    def test_approve_guest_only_after_end(self):
        reg = OpportunityRegistration.objects.create(
            project=self.project,
            full_name="ضيف اعتماد",
            email="promote@test.com",
            phone="533333333",
            national_id="3333333333",
            source=OpportunityRegistration.SOURCE_GUEST,
            status=OpportunityRegistration.STATUS_CONFIRMED,
            email_verified_at=timezone.now(),
            confirmed_at=timezone.now(),
        )
        self.client.force_authenticate(self.admin)
        res = self.client.post(f"/api/admin/opportunity-registrations/{reg.id}/approve/", {}, format="json")
        self.assertEqual(res.status_code, 400)

        self.project.end_date = timezone.localdate() - timedelta(days=1)
        self.project.save(update_fields=["end_date"])
        res2 = self.client.post(f"/api/admin/opportunity-registrations/{reg.id}/approve/", {}, format="json")
        self.assertEqual(res2.status_code, 200, res2.data)
        self.assertEqual(res2.data["status"], "approved")
        self.assertTrue(User.objects.filter(email="promote@test.com").exists())

    def test_expired_otp_rejected(self):
        otp = request_otp("expire@test.com", EmailOTP.PURPOSE_REGISTER)
        EmailOTP.objects.filter(pk=otp.pk).update(expires_at=timezone.now() - timedelta(minutes=1))
        self.assertFalse(verify_otp("expire@test.com", EmailOTP.PURPOSE_REGISTER, otp.code))
