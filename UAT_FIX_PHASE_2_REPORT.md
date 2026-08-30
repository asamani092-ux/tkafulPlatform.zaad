# UAT_FIX_PHASE_2_REPORT — هجرة الإشعارات + إزالة N+1 للكفالات

**الفرع:** `cursor/fix-migration-nplusone-069a` (مقابل الوثيقة: `fix/migration-and-nplusone`)  
**الأساس:** طرف المرحلة 1  
**القرار:** D-49

## ما نُفّذ

- هجرة `notifications.0003_rename_notificationpreference_index` (إعادة تسمية فهرس تجميلية، قابلة للعكس).
- `makemigrations --check` نظيف لكل التطبيقات.
- `annotate_sponsorship_funding` عبر `Subquery` على قائمة الكفالات؛ الخاصية تبقى للتفصيل.
- اختبار `assertNumQueries(1)` لـ 8 كفالات.

## جدول متطلب → ملف/اختبار

| المتطلب | الملف |
|---------|-------|
| هجرة الفهرس | `notifications/migrations/0003_rename_notificationpreference_index.py` |
| annotation القائمة | `sponsorships/views.py::annotate_sponsorship_funding` |
| مسلسل يستخدم annotation | `sponsorships/serializers.py` |
| assertNumQueries | `sponsorships/tests_nplusone.py` |
| القرار | `DECISIONS.md` → D-49 |

## بوابة القبول

| البوابة | النتيجة |
|---------|---------|
| `makemigrations --check` | نظيف |
| عكس الهجرة 0003→0002→0003 | نجح |
| حزمة Django | 239 OK (skipped=1) |
| vitest | 60/60 |
| build | vendor-react 230.96 kB |
| `check --deploy` | تحذيرات DEBUG فقط |

## مؤجّل

- لا شيء في نطاق المرحلة 2.
