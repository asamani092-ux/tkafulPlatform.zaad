from django.core import mail
from django.test import SimpleTestCase, TestCase, override_settings

from core.email_rtl import (
    MSG_FROM_MISMATCH,
    MSG_SEND_AS_DENIED,
    MailFromMismatchError,
    render_rtl_html,
    resolve_from_email,
    send_rtl_email,
    smtp_error_to_ar,
)
from core.models import PlatformSetting


class EmailRtlTests(SimpleTestCase):
    def test_render_contains_rtl(self):
        html = render_rtl_html(title="تجربة", plain_body="مرحبا\n\nhttps://example.com/x")
        self.assertIn('dir="rtl"', html)
        self.assertIn('lang="ar"', html)
        self.assertIn("text-align:right", html)
        self.assertIn("https://example.com/x", html)

    @override_settings(
        EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
        EMAIL_HOST_USER="",
        DEFAULT_FROM_EMAIL="noreply@takaful.local",
    )
    def test_send_rtl_email(self):
        ok = send_rtl_email(subject="عنوان", body="نص الرسالة", to="a@test.com")
        self.assertTrue(ok)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, ["a@test.com"])
        self.assertIn('dir="rtl"', mail.outbox[0].alternatives[0][0])

    @override_settings(EMAIL_HOST_USER="tkaful@alzaad.org.sa", DEFAULT_FROM_EMAIL="td@alzaad.org.sa")
    def test_reject_from_mismatch_host_user(self):
        with self.assertRaises(MailFromMismatchError) as ctx:
            resolve_from_email("td@alzaad.org.sa")
        self.assertIn("SMTP", str(ctx.exception))

    @override_settings(EMAIL_HOST_USER="tkaful@alzaad.org.sa", DEFAULT_FROM_EMAIL="td@alzaad.org.sa")
    def test_accept_from_matching_host_user(self):
        self.assertEqual(
            resolve_from_email("tkaful@alzaad.org.sa"),
            "tkaful@alzaad.org.sa",
        )

    def test_smtp_error_send_as_to_ar(self):
        exc = Exception(
            "SendAsDenied; tkaful@alzaad.org.sa not allowed to send as td@alzaad.org.sa"
        )
        self.assertEqual(smtp_error_to_ar(exc), MSG_SEND_AS_DENIED)
        self.assertNotIn("SendAsDenied", smtp_error_to_ar(exc))
        self.assertEqual(smtp_error_to_ar(MailFromMismatchError(MSG_FROM_MISMATCH)), MSG_FROM_MISMATCH)


class EmailRtlDbTests(TestCase):
    @override_settings(
        EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
        EMAIL_HOST_USER="tkaful@alzaad.org.sa",
        DEFAULT_FROM_EMAIL="td@alzaad.org.sa",
    )
    def test_send_rejects_explicit_mismatch(self):
        with self.assertRaises(MailFromMismatchError):
            send_rtl_email(
                subject="x",
                body="y",
                to="a@test.com",
                from_email="td@alzaad.org.sa",
                fail_silently=False,
            )
        self.assertEqual(len(mail.outbox), 0)

    @override_settings(
        EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
        EMAIL_HOST_USER="tkaful@alzaad.org.sa",
        DEFAULT_FROM_EMAIL="td@alzaad.org.sa",
    )
    def test_platform_mail_from_used_when_matching(self):
        obj = PlatformSetting.load()
        obj.mail_from_email = "tkaful@alzaad.org.sa"
        obj.save(update_fields=["mail_from_email"])
        ok = send_rtl_email(subject="عنوان", body="نص", to="a@test.com")
        self.assertTrue(ok)
        self.assertEqual(mail.outbox[0].from_email, "tkaful@alzaad.org.sa")
