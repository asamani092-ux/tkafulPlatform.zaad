# CONFIGURATION.md — نموذج المنصّة القابل للتهيئة (تكافل وأثر / زاد)

كتلة الإعدادات تعيش اليوم على `PlatformSetting` (singleton `pk=1`).
مسار الترقية لاحقاً: نسخ الكتلة كما هي إلى صف `Organization` دون تغيير المفاتيح.

## كتلة الإعدادات

| المفتاح | النوع | قيمة زاد | الأثر |
|---------|-------|----------|--------|
| `roles_can_login` | JSON أدوار | admin/manager/employee/user=true؛ donor/supplier/representative/beneficiary=false | يغلق إصدار JWT إن الدور معطّل. ملاحظة: `user` = متطوّع. |
| `sponsorship_payments_enabled` | bool | `false` | عند false: لا جمع مال، `total_funded=0`، رفض `/pay` بـ 403. عند true: السلوك المالي الكامل بما فيه منع overfund. |
| `sponsorship_gps_documentation` | bool | `false` | عند false: إسقاط lat/lng من التوثيق وإخفاء حقول GPS في واجهة المندوب. |
| `sponsorship_collect_donor_data` | enum | `name_optional` | `none` يرفض أي اسم؛ `name_optional` يسمح بالاسم؛ `full` يسمح بالاسم (لا حقول هاتف على نموذج الكفالة). |

## واجهات

- عام: `GET /api/public-settings/`
- مشرف: `GET/PATCH /api/settings/`
- إحصاءات عامة مموّهة: `GET /api/saqya/public-stats/`
- بذرة: `python manage.py seed_zaad_config`

## قدرات تبقى في الكود (تهيئة لا حذف)

- `record_payment` + overfund
- بوابات Donor / Supplier / Representative
- حقول GPS على Documentation
- جدول `SponsorshipStatus`

## مسار Organization لاحقاً

1. إنشاء نموذج Organization بحقول الكتلة الأربعة أعلاه بنفس الأسماء.
2. نقل `runtime_config` ليقرأ من Organization النشطة ثم يسقط إلى PlatformSetting.
3. لا تغيير على مفاتيح JSON أو قيم enum.
