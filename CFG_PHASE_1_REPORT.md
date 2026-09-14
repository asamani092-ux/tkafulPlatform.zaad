# CFG_PHASE_1_REPORT — كفالة عينية افتراضياً / مال خلف إعداد

## الهدف
جعل `amount` اختيارياً، وتشغيل منطق المال فقط عند `sponsorship_payments_enabled=True`، مع جدول حالات قابل للتهيئة وبذرة زاد.

## ما نُفّذ

### PlatformSetting (`backend/core/models.py`)
- `roles_can_login` (JSON، بذرة زاد: donor/supplier/representative/beneficiary = false)
- `sponsorship_payments_enabled` (افتراضي False)
- `sponsorship_gps_documentation` (افتراضي False)
- `sponsorship_collect_donor_data` ∈ {none, name_optional, full} (افتراضي name_optional)
- تعريض عبر `PUBLIC_SETTING_KEYS` + PATCH إداري + واجهة إعدادات المنصّة

### Sponsorship
- `amount` nullable
- `sponsor_name` اختياري
- `kind` ∈ {individual, community}
- `units_target` / `units_completed`
- `donor` nullable (تسجيل إداري لاحقاً)
- `status_ref` FK → `SponsorshipStatus` مع مزامنة CharField `status`

### SponsorshipStatus
- زراعة زاد النشطة: available → sponsored → prepared → delivered
- زراعة التراث خامدة: pending, approved, rejected, in_progress, completed, cancelled
- backfill: pending→available, approved→sponsored, in_progress→prepared, completed→delivered, rejected/cancelled→cancelled

### بوابة المال
- `record_payment` يرفض بـ 403 عند تعطيل المدفوعات
- `total_funded` / `remaining` / `is_fully_funded` تُرجع قيماً محايدة عند التعطيل
- عند التفعيل: منع التمويل الزائد كما كان (بما فيه overfund)

### واجهة
- تبويب «الكفالات والدخول» في `PlatformSettings.tsx`
- حقول جديدة في `PlatformSettingsContext`

## الاختبارات
```
./venv/bin/python manage.py test sponsorships.tests_configurable_phase1 \
  sponsorships.tests sponsorships.tests_nplusone sponsorships.tests_control_e2e \
  core.tests_security.ConcurrentPaymentTests
→ 21 OK (1 skipped)
```
- `manage.py check --deploy`: تحذيرات SSL متوقعة في التطوير فقط
- `npm run build` (tsc + vite): نجح

## تعقيد تقريبي
- قراءة إعدادات التشغيل: O(1) مع كاش TTL
- تسجيل دفعة: O(1) استعلامات مع `select_for_update`
- زراعة الحالات: O(S) لعدد الحالات الثابت

## مخاطر مُعالجة
- هجرة status → FK مع عدّ صفوف قبل/بعد في اختبار backfill
- اختبارات overfund تعمل فقط مع المدفوعات On
- N+1 قائمة الكفالات: استعلامان ثابتان (قائمة + PlatformSetting مرة)
