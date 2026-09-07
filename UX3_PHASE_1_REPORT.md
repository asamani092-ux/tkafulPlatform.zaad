# UX3_PHASE_1_REPORT — إيقاف إعادة التركيب عند الحفظ

**الفرع:** `cursor/ux3-phase1-no-remount-069a`  
**الأساس:** `main` @ `6d6483e`

## المشكلة

بعد كل طفرة كانت صفحات الإدارة تستدعي `load()` الذي يضبط `setLoading(true)` فيُرجع مبكراً `<AdminShell><LoadingState/></AdminShell>` ويعيد تركيب الشجرة — إحساس «إعادة تحميل كاملة» دون `window.location`.

## الحل

- مساعد `shouldFlipPageLoading(mode)` في `frontend/src/admin/loadMode.ts` — يقلب بوابة التحميل فقط عند `mode === "initial"`.
- صفحات محدّثة: `PlatformProjects`, `RequestFormsAdmin`, `MapsAdmin`, `ProjectTypesAdmin`, `UsersAdmin`, `ActivityLogAdmin`.
- طفرات/تحديثات لاحقة: `load("silent")` / `loadMaps("silent")` — القائمة والنوافذ تبقى مفتوحة؛ التوست فقط.
- `ReportGateway` مُستثنى (تحميل زر تشغيل تقرير صريح).

## NON-ISSUES (موثّق)

- UAT 3.8 نطاق الكادر تحت التقارير — متعمّد، بلا تغيير.
- UAT 8.1 تفضيلات المتطوّع في `/user/settings` — صحيح للمتطوّع، بلا تغيير في هذه المرحلة.

## البوابة

- `manage.py check` — نظيف.
- `vitest` — `loadMode.test.ts` ناجح.
- نمط: لا `setLoading(true)` خارج فرع `shouldFlipPageLoading` في مسارات الطفرات.
