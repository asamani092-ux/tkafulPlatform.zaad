# UAT_FIX_PHASE_1_REPORT — إغلاق تسريب المشاريع غير النشطة

**الفرع:** `cursor/fix-public-project-leak-069a` (مقابل الوثيقة: `fix/public-project-leak`)  
**الأساس:** `main`  
**القرار:** D-48 في `DECISIONS.md`

## ما نُفّذ

- مصدر عام موحّد `public_volunteering_profiles_qs()` يفرض `status ∈ PUBLIC_STATUSES` + `is_active` + `not is_hidden`.
- `/api/public-projects/` و`/api/user/opportunities/` و`apply` و`/api/public-home-stats/` تستخدم الفلتر.
- المصدر الكانوني للمنصّة يبقى `/api/platform/public/projects/` (كان صحيحاً مسبقاً).
- اختبارات تسريب تغطي مسودة/مؤرشف/مكتمل/موقوف/مخفي.

## جدول متطلب → ملف/اختبار

| المتطلب | الملف / الاختبار |
|---------|------------------|
| فلتر active-only للمسار التطوّعي | `volunteering/project_helpers.py`, `volunteering/views.py` |
| مسح تسريب الفرص والتقديم | `available_opportunities`, `apply_to_opportunity` |
| إحصاءات عامة بلا مسودات | `public_home_stats` + `aggregate_* (public_only)` |
| اختبارات المسودة/المؤرشف | `volunteering/tests_public_leak.py` |
| تكييف إشعار التطوع | `notifications/tests_center.py` |
| توثيق القرار | `DECISIONS.md` → D-48 |

## بوابة القبول

| البوابة | النتيجة |
|---------|---------|
| `manage.py test` (كامل) | 237 OK (skipped=1) |
| اختبارات التسريب | 6/6 OK |
| `check --deploy` | تحذيرات بيئة DEBUG فقط (W004/W008/W009/W012/W016/W018) — بلا أخطاء |
| vitest | 60/60 |
| `tsc && vite build` | ناجح؛ `vendor-react` 230.96 kB < 250 |

## مؤجّل

- لا شيء في نطاق المرحلة 1.
- جولة UAT المتبقية (23 بنداً: كفالات/خرائط/سلامة بيانات) خارج النطاق حسب الوثيقة.
