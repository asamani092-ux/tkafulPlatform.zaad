# DEPRECATIONS — الكود المهمل ومسار حذفه

آخر تحديث: فرع `cursor/zaad-ds-additive-ui-069a` (D-21).

## حُذف في هذا الفرع (كان مؤجلاً)

- `frontend/src/legacy/` (~99 ملفاً غير مُوجَّه وغير مشمول بـ tsc) — حُذف.
- `Sidebar.jsx` في جذر المستودع — حُذف.
- `package.json` في جذر المستودع — حُذف.
- سكربتات `*.ps1` في حزمة design-system — لم تُستعد عند إعادة إنشاء `design-system/` (D-01).
- `frontend/src/components/pages/map/` (صفحة خارطة تفقدهم القديمة) — حلّ محلها
  المجمّع الموحّد `/map` وخرائط المشاريع `/projects/{slug}/map` (نظام maps الجديد).
- `frontend/src/components/pages/admin/ImpactMapAdmin.tsx` — حلّت محلها `/Admin/maps`.
- **`design-system/` المحلي** و**`Design_system_f/`** — حُذفا بعد ربط
  `@zaad/design-system@v1.2.0` ونجاح `npm run build` (D-21 / AGENT_COMMAND).

## مهمل حالياً (يُحذف في PR لاحق بعد استقرار إعادة الهيكلة)

- **backend/`saqya`**: بقيت قشرة (هجرات + shims استيراد) بعد نقل النماذج/الـviews إلى
  `sponsorships` (D-02). تُحذف بعد squash للهجرات في إصدار لاحق.
- **backend/`takaful_app`**: نفس الوضع بعد النقل إلى `volunteering`.
- **backend/`impact_map`**: بياناته نُسخت إلى نظام `maps` تحت مشروع «تفقدهم» (D-03).
  تبقى الجداول مصدر حقيقة احتياطي و`/api/map/*` حية للتوافق. بعد الاستقرار:
  هجرة `DistributionRecord` (لم تكن ضمن نطاق النقل) ثم إزالة التطبيق.
- **`volunteering.Volunteer`** (النموذج القديم): ما زال ينتظر هجرة بياناته إلى User+Profile
  قبل الحذف (شرط قائم من النسخة السابقة لهذا الملف).
- **مسار `/api/map/*` العام القديم**: الواجهة الجديدة تستخدم `/api/maps/*`. يبقى المسار القديم
  للتوافق مع أي عميل خارجي، ويُزال بعد التأكد من عدم وجود مستهلكين.

## قاعدة الحذف

قبل حذف أي عنصر: (1) grep على مراجع حية، (2) هجرة أي بيانات متبقية،
(3) PR منفصل مع حزمة اختبارات خضراء.
