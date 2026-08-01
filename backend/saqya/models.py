"""
shim توافق: نماذج saqya انتقلت إلى تطبيق sponsorships (انظر DECISIONS.md D-02).
تبقى هذه الاستيرادات لأن هجرات saqya القديمة تشير إلى saqya.models.invoice_upload_path
و documentation_upload_path، ولثبات واجهات الاستيراد القديمة
(core.tests_security, integrations). لا تضف نماذج جديدة هنا.
"""
from sponsorships.models import (  # noqa: F401
    Documentation,
    Invoice,
    Order,
    Payment,
    RepresentativeProfile,
    Sponsorship,
    SupplierProfile,
    documentation_upload_path,
    invoice_upload_path,
)
