# CFG_PHASE_3_REPORT — استقبال كفالة + متجر خارجي + خصوصية

## الهدف
فرصة عامة → `project.donation_url`؛ تسجيل إداري بلا بيانات مستفيد؛ فرض سياسة PII للمتبرّع؛ إخفاء العدّادات العامة `<5`.

## ما نُفّذ

### فرصة عامة
- `ProjectLanding`: زر «التبرّع عبر المتجر الخارجي» عند وجود `donation_url`
- عرض إحصاءات عامة من `/api/saqya/public-stats/` مع تمويه `<5`

### تسجيل إداري
- `CAP_CREATE_SPONSORSHIP` للمشرف والمدير
- `perform_create`: إداري بلا `donor` إلزامي
- نموذج تسجيل في `AdminPortal` (نوع / فردية|مجتمعية / اسم حسب السياسة / وحدات)

### فرض PII
- `SponsorshipSerializer.validate`:
  - يرفض حقول مستفيد (`beneficiary_*`)
  - `none` → يرفض `sponsor_name`
  - `name_optional` / `full` → يسمح بالاسم فقط (لا هاتف على النموذج)

### خصوصية العدّ
- `public_sponsorship_stats` + `mask_small_count` من `maps.services`

## الاختبارات
`sponsorships.tests_configurable_phase3` — تسجيل إداري، رفض PII، عدّ مجتمعي، تمويه الإحصاءات.

## تعقيد
- فرض السياسة: O(1)
- إحصاءات عامة: O(1) تجميعات SQL + تمويه ثابت
