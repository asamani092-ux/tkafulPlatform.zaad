"""اختبارات دعوة تعيين كلمة المرور."""
from django.contrib.auth.models import User
from django.test import override_settings
from django.utils import timezone
from rest_framework.test import APITestCase

from accounts.models import PasswordInviteToken, Profile
from accounts.tests_admin_users import make_user


class PasswordInviteTests(APITestCase):
    def setUp(self):
        self.admin = make_user("admin@invite.test", "admin")

    def test_invite_creates_user_and_token(self):
        self.client.force_authenticate(self.admin)
        res = self.client.post(
            "/api/accounts/auth/invite/",
            {"email": "new@invite.test", "name": "مدعو", "role": "employee"},
            format="json",
        )
        self.assertEqual(res.status_code, 201, res.content)
        self.assertTrue(res.data["created"])
        user = User.objects.get(email="new@invite.test")
        self.assertFalse(user.has_usable_password())
        self.assertTrue(PasswordInviteToken.objects.filter(user=user, consumed_at__isnull=True).exists())

    def test_accept_invite_sets_password(self):
        self.client.force_authenticate(self.admin)
        created = self.client.post(
            "/api/accounts/auth/invite/",
            {"email": "set@invite.test", "name": "تعيين", "role": "employee"},
            format="json",
        )
        token = PasswordInviteToken.objects.get(user__email="set@invite.test").token
        self.client.logout()
        status = self.client.get(f"/api/accounts/auth/invite/{token}/")
        self.assertEqual(status.status_code, 200)
        accept = self.client.post(
            f"/api/accounts/auth/invite/{token}/accept/",
            {"password": "Hello12345!"},
            format="json",
        )
        self.assertEqual(accept.status_code, 200, accept.content)
        user = User.objects.get(email="set@invite.test")
        self.assertTrue(user.check_password("Hello12345!"))
        invite = PasswordInviteToken.objects.get(token=token)
        self.assertIsNotNone(invite.consumed_at)

    @override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
    def test_forgot_password_sends_for_existing_user(self):
        from django.core import mail

        user = make_user("reset@invite.test", "employee")
        before = PasswordInviteToken.objects.count()
        res = self.client.post(
            "/api/accounts/auth/forgot-password/",
            {"email": "reset@invite.test"},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        self.assertIn("بريد", res.data["detail"])
        self.assertEqual(PasswordInviteToken.objects.count(), before + 1)
        self.assertTrue(len(mail.outbox) >= 1)
        self.assertIn("إعادة تعيين", mail.outbox[-1].subject)
        self.assertIn(user.email, mail.outbox[-1].to)

    def test_forgot_password_unknown_email_generic_ok(self):
        res = self.client.post(
            "/api/accounts/auth/forgot-password/",
            {"email": "nobody@missing.test"},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        self.assertIn("بريد", res.data["detail"])
        self.assertFalse(PasswordInviteToken.objects.filter(user__email="nobody@missing.test").exists())
