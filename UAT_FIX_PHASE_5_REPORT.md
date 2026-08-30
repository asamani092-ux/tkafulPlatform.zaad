# UAT_FIX_PHASE_5_REPORT — كنس الاتساق وإعادة التحقق من الصلاحيات

**الفرع:** `cursor/feat-uat-consistency-069a` (مقابل الوثيقة: `feat/uat-consistency-sweep`)  
**الأساس:** طرف المرحلة 4  
**القرار:** D-52

## ما نُفّذ

- اختبارات نطاق مدير المشروع (`uat_pm` مكافئ): قائمة مشاريع مقيّدة + 403 على APIs المشرف.
- إعادة مسح خصوصية: لا مسودات في public-projects؛ لا PII في public-forms.
- توسيع `access.test.ts` لحجب settings/reports/users عن PM.
- تحديث `FEATURE_MATRIX.md` وملحق `PERMISSION_TABLE.md`.

## جدول متطلب → ملف

| المتطلب | الملف |
|---------|-------|
| نطاق PM | `core/tests_uat_phase5.py`, `access.test.ts` |
| خصوصية | `tests_uat_phase5.PrivacyResweepTests` |
| مصفوفة UAT | `FEATURE_MATRIX.md` |
| جدول صلاحيات | `PERMISSION_TABLE.md` |
| القرار | D-52 |

## بوابة القبول

| البوابة | النتيجة |
|---------|---------|
| Django | 249 OK |
| `makemigrations --check` | نظيف |
| vitest | 64/64 |
| build | vendor-react 230.96 kB < 250 |

## مؤجّل (الجولة التالية — 23 بنداً)

- دورة الكفالات 5.1–5.7
- تدفقات الخرائط 6.1–6.6
- سلامة البيانات 7.1
