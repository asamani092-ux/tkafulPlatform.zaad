# تقرير بوابة المرحلة 3 — صقل الدورة + تكامل E2E

## النطاق

- صقل `AdminPortal` المضمّن: حالات عربية، أزرار دورة الطلب كاملة، إسناد مقيّد، تبويب الأنواع.
- اختبار تكامل E2E من إنشاء نوع حتى إكمال الدورة مع رفض تجاوز التمويل.
- تحديث `PERMISSION_TABLE.md` و`FEATURE_MATRIX.md`.

## النتائج

| عنصر | الحالة |
|------|--------|
| AdminPortal — EmptyState / LoadingState / ORDER_FLOW | تم |
| إسناد مفلتر + رسائل خطأ واضحة | تم |
| `tests_control_e2e.py` | أخضر |
| PERMISSION_TABLE / FEATURE_MATRIX | محدّثان |
| جناح الكفالات + tool_config + security | أخضر |
| `npm run build` | أخضر |
| `manage.py check --deploy` | تحذيرات بيئة محلية فقط (DEBUG/SECRET_KEY/HSTS…) — ليست انحداراً من هذا العمل |

## اختبار E2E (`test_full_control_cycle`)

1. إنشاء نوع بحقل نص مطلوب  
2. متبرّع ينشئ كفالة مع `type_data`  
3. موافقة إدارية  
4. رفض إسناد مورّد خارج القائمة  
5. قبول إسناد مورّد مسموح  
6. prepare → ready → deliver → complete  
7. رفض دفع يتجاوز المتبقي  

## الخلاصة

بوابة المرحلة 3 ناجحة. نظام التحكم الكامل جاهز لطلب السحب الواحد إلى `main`.
