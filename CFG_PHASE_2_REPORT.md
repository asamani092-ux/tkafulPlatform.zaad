# CFG_PHASE_2_REPORT — دخول الأدوار كتهيئة

## الهدف
`roles_can_login` يغلق المصادقة لدور معطّل؛ البوابات تبقى في الكود خلف بوابة؛ GPS خلف إعداد.

## ما نُفّذ

### مصادقة
- `EmailTokenObtainPairSerializer.validate`: بعد نجاح كلمة المرور يستدعي `role_can_login(role)`؛ عند الرفض رسالة عربية بلا توكن.

### توجيه الدخول (`SignIn.tsx`)
- admin → `/Admin`
- manager / employee → `/Admin/staff`
- donor / supplier / representative → `/projects` (لا سقوط إلى `/user/main`)
- beneficiary → `/user/main`
- user (متطوّع) → عضويات أو `/userr/main`

### بوابات السقيا (`saqya/index.tsx`)
- ملفات Donor/Supplier/Representative/AdminPortal **لم تُحذف**
- العرض مشروط بـ `roles_can_login[role]`؛ وإلا رسالة 403

### GPS
- `DocumentationSerializer` و`DocumentationViewSet.create` يسقطان/يتجاوزان GPS إن `sponsorship_gps_documentation=False`
- واجهة المندوب تخفي حقول lat/lng عند التعطيل

## الاختبارات
`sponsorships.tests_configurable_phase2` — رفض دور معطّل، نجاح دور مفعّل، تفعيل donor يعيد التوكن، بوابة GPS.

## تعقيد
- بوابة الدور: O(1) بعد كاش الإعدادات
- لا تغيير على مسار إسناد المورّد/المندوب الإداري
