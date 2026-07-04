# Payments — External Store + Manual Reconciliation

المنصّة **لا تعالج مدفوعات البطاقات**. التبرّع يتم عبر متجر خارجي؛
المشرف يسجّل الدفعات المؤكّدة داخلياً.

## التدفّق

1. **المتبرّع** يضغط «تبرّع / Contribute» في `DonorPortal` → `GET /api/saqya/sponsorships/{id}/checkout_url/`
2. **PaymentProvider** (`saqya/payments.py`) يبني رابط `EXTERNAL_STORE_URL` مع query params:
   - `ref`, `sponsorship_id`, `amount`
3. المتبرّع يُحوَّل للمتجر الخارجي (Salla/Zid/…)
4. **المشرف** يسجّل الدفعة يدوياً عبر `POST .../pay/` أو Django admin — ينشئ `Payment(status=completed)`
5. **أتمتة الحالة:** عند اكتمال التمويل → `sponsorship.status = in_progress`

## الإعداد

```env
EXTERNAL_STORE_URL=https://store.example.com/donate
```

## PaymentProvider (seam)

```python
class PaymentProvider(ABC):
    def create_checkout(self, request: CheckoutRequest) -> CheckoutResult: ...
    def verify_callback(self, payload: dict) -> CallbackVerification: ...
```

- **`ManualPaymentProvider`** — التطبيق الحالي (redirect فقط)
- **مستقبلاً:** `MoyasarProvider`, `TapProvider`, … بدون تغيير schema

## نموذج Payment

يُستخدم للتسوية الداخلية فقط: `amount`, `method`, `transaction_id`, `reference_number`, `status`.

## ملاحظات أمنية

- `pay/` محمي بـ `select_for_update` ضد overfunding
- لا webhook حتى إضافة provider حقيقي عبر `verify_callback`
