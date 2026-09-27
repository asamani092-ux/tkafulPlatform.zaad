from django.core import mail
from django.test import SimpleTestCase, override_settings

from core.email_rtl import render_rtl_html, send_rtl_email


class EmailRtlTests(SimpleTestCase):
    def test_render_contains_rtl(self):
        html = render_rtl_html(title="تجربة", plain_body="مرحبا\n\nhttps://example.com/x")
        self.assertIn('dir="rtl"', html)
        self.assertIn('lang="ar"', html)
        self.assertIn("text-align:right", html)
        self.assertIn("https://example.com/x", html)

    @override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
    def test_send_rtl_email(self):
        ok = send_rtl_email(subject="عنوان", body="نص الرسالة", to="a@test.com")
        self.assertTrue(ok)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, ["a@test.com"])
        self.assertIn('dir="rtl"', mail.outbox[0].alternatives[0][0])
