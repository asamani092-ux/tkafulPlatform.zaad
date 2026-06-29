from django.contrib.auth.models import User
from django.test import TestCase

from saqya.models import Sponsorship
from integrations.management.commands.import_saqya_data import SaqyaImporter


class SaqyaImportMergeTests(TestCase):
    def setUp(self):
        # مستخدم موحّد قائم (سيتطابق بالبريد عند الاستيراد)
        self.existing = User.objects.create_user(
            username="donor@x.com", email="donor@x.com", password="Hello12345!"
        )
        self.existing.profile.name = "متبرّع قائم"
        self.existing.profile.role = "user"
        self.existing.profile.save()

    def _data(self):
        return {
            "users": [
                {"id": 1, "name": "Donor X", "email": "donor@x.com", "phone": "", "role": "donor"},
                {"id": 2, "name": "New Supplier", "email": "sup@new.com", "phone": "555", "role": "supplier"},
            ],
            "sponsorships": [
                {"id": 100, "donor_id": 1, "amount": 500, "type": "سقيا", "status": "pending"},
            ],
        }

    def test_merge_does_not_duplicate_and_attaches_sponsorship(self):
        stats = SaqyaImporter().run(self._data())
        # لم يُنشأ مستخدم جديد بنفس البريد
        self.assertEqual(User.objects.filter(email="donor@x.com").count(), 1)
        self.assertEqual(stats["merged_users"], 1)
        self.assertEqual(stats["created_users"], 1)  # المورّد الجديد فقط
        # الكفالة مرتبطة بالمستخدم القائم
        sp = Sponsorship.objects.get(external_source="saqya", external_id="100")
        self.assertEqual(sp.donor_id, self.existing.id)
        # اسم المستخدم القائم لم يُستبدل
        self.existing.profile.refresh_from_db()
        self.assertEqual(self.existing.profile.name, "متبرّع قائم")

    def test_new_user_forces_password_reset(self):
        SaqyaImporter().run(self._data())
        sup = User.objects.get(email="sup@new.com")
        self.assertTrue(sup.profile.must_reset_password)
        self.assertEqual(sup.profile.external_source, "saqya")
        self.assertFalse(sup.has_usable_password())

    def test_idempotent_on_rerun(self):
        SaqyaImporter().run(self._data())
        SaqyaImporter().run(self._data())
        self.assertEqual(User.objects.filter(email="sup@new.com").count(), 1)
        self.assertEqual(Sponsorship.objects.filter(external_source="saqya", external_id="100").count(), 1)
