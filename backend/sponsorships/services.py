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
    ويرقّي الحالة إلى in_progress عند اكتمال التمويل.
    """
    if amount <= 0:
        raise PaymentError("المبلغ يجب أن يكون موجباً")

    with transaction.atomic():
        sp = Sponsorship.objects.select_for_update().get(pk=sponsorship_id)
        if user_role != "admin" and sp.donor_id != user.id:
            raise PaymentError("غير مصرّح", status_code=403)
        if sp.status in ("rejected", "cancelled", "completed"):
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
        if sp.is_fully_funded and sp.status in ("pending", "approved"):
            sp.status = "in_progress"
            sp.funded_at = timezone.now()
            sp.save(update_fields=["status", "funded_at", "updated_at"])

    return payment, sp
