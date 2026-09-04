"""
منطق أعمال الكفالات (fat models, thin views) — مستخرج من الـ ViewSet دون تغيير
واجهة الـ API (ثبات الواجهات). أهم جزء: تسجيل الدفع الآمن ضد التسابق
(select_for_update) مع منع التمويل الزائد — O(1) استعلامات لكل عملية.
"""
from decimal import Decimal

from django.db import transaction
from django.utils import timezone

from .models import Payment, Sponsorship


class PaymentError(Exception):
    def __init__(self, detail: str, status_code: int = 400):
        self.detail = detail
        self.status_code = status_code
        super().__init__(detail)


def record_payment(*, sponsorship_id: int, user, user_role: str, amount: Decimal,
                   method: str = "online", transaction_id: str = "",
                   reference_number: str = "") -> tuple[Payment, Sponsorship]:
    """
    يسجّل دفعة مكتملة بقفل صف الكفالة (select_for_update) لمنع سباق التمويل الزائد،
    ويرقّي الحالة عند اكتمال التمويل. يُرفض بالكامل إذا المدفوعات معطّلة في الإعدادات.
    """
    from core.runtime_config import payments_enabled

    if not payments_enabled():
        raise PaymentError("المدفوعات غير مفعّلة لهذه المنصّة", status_code=403)
    if amount <= 0:
        raise PaymentError("المبلغ يجب أن يكون موجباً")

    with transaction.atomic():
        sp = Sponsorship.objects.select_for_update().get(pk=sponsorship_id)
        if user_role != "admin" and sp.donor_id != user.id:
            raise PaymentError("غير مصرّح", status_code=403)
        if sp.amount is None:
            raise PaymentError("هذه الكفالة عينية ولا تقبل دفعاً نقدياً")
        if sp.status in ("rejected", "cancelled", "completed", "delivered"):
            raise PaymentError("لا يمكن الدفع لهذه الكفالة")
        if float(sp.total_funded) + float(amount) > float(sp.amount):
            raise PaymentError(f"المبلغ يتجاوز المتبقّي ({sp.remaining})")

        payment = Payment.objects.create(
            sponsorship=sp,
            amount=amount,
            method=method,
            transaction_id=transaction_id,
            reference_number=reference_number,
            status="completed",
        )
        if sp.is_fully_funded and sp.status in (
            "pending", "approved", "available", "sponsored"
        ):
            # مع المدفوعات: الانتقال إلى in_progress؛ مع حالات زاد يبقى sponsored
            sp.status = "in_progress" if sp.status in ("pending", "approved") else "sponsored"
            sp.funded_at = timezone.now()
            # مزامنة status_ref إن وُجدت
            from .models import SponsorshipStatus
            ref = SponsorshipStatus.objects.filter(slug=sp.status).first()
            update_fields = ["status", "funded_at", "updated_at"]
            if ref:
                sp.status_ref = ref
                update_fields.append("status_ref")
            sp.save(update_fields=update_fields)

    return payment, sp
