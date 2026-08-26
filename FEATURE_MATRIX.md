# FEATURE_MATRIX.md — Takaful wa Athar

مصدر حقيقة واحد لجولة `/uat`: لكل أداة/صفحة، العمليات المتاحة (قائمة/إنشاء/تعديل/حذف/إجراءات)،
الدور الذي يستخدمها، والمسار. الأدوار: **admin** = المشرف العام، **staff** = عضو مشروع
(project_admin/editor/viewer)، **orgStaff** = admin/manager/employee، **auth** = أي مستخدم مسجّل،
**public** = بلا مصادقة.

## أدوات الإدارة الأفقية (Core Admin)

| الأداة | المسار | قائمة | إنشاء | تعديل | حذف | إجراءات | الدور | API |
|-------|--------|:----:|:----:|:----:|:---:|---------|------|-----|
| نظرة عامة | `/Admin` | ✓ | — | — | — | روابط النطاقات | admin/staff | — |
| المستخدمون | `/Admin/users` | ✓ | ✓ | ✓ | ✓ | set_role, set_active | admin | `/api/accounts/users/` |
| إعدادات المنصّة | `/Admin/settings` | ✓ | — | ✓ | — | حفظ الإعدادات + الصفحات الثابتة | admin | `/api/settings/`, `/api/static-pages/` |
| بث إشعار | `/Admin/settings/broadcast` | — | ✓ | — | — | broadcast (throttled) | admin | `/api/notifications/broadcast/` |
| الأدوار | `/Admin/settings/roles` | ✓ | — | — | — | قراءة فقط (مصفوفة) | admin | `/api/roles/` |
| سجل النشاط | `/Admin/settings/activity` | ✓ | — | — | — | فلترة (append-only) | admin | `/api/activity-logs/` |
| أنواع المشاريع | `/Admin/settings/project-types` | ✓ | ✓ | ✓ | ✓ | تفعيل/تعطيل | admin | `/api/platform/project-types/` |
| الإشعارات (الجرس) | كل الأغلفة | ✓ | — | — | — | mark-read, mark-all, تفضيلات | auth | `/api/notifications/` |

## نطاقات العمل (Business Domains)

| النطاق | المسار | قائمة | إنشاء | تعديل | حذف | إجراءات | الدور | API |
|-------|--------|:----:|:----:|:----:|:---:|---------|------|-----|
| المشاريع | `/Admin/projects` | ✓ | ✓ (admin) | ✓ | ✓ (admin) | **دورة الحياة**: activate/complete/archive/reopen، set_tool، أعضاء، تبرّع، تمييز، **النوع** | admin/staff | `/api/platform/projects/` |
| إنشاء مشروع | `/Admin/projects/create` | — | ✓ | — | — | نموذج | admin | `/api/platform/projects/` |
| المتطوعون | `/Admin/volunteers` | ✓ | — | ✓ | — | إدارة | admin | `/api/volunteers/` |
| طلبات التطوع | `/Admin/volunteers/applications` | ✓ | — | ✓ | — | قبول/رفض | admin | `/api/user/opportunities/.../` |
| طلبات الانضمام | `/Admin/volunteers/join-requests` | ✓ | — | ✓ | — | قبول/رفض | admin | `/api/...` |
| طلبات الخدمات | `/Admin/requests` | ✓ | — | ✓ | — | حالة الطلب | admin | `/api/service-requests/` |
| طلبات سقيا الماء | `/Admin/requests/water-supply` | ✓ | — | ✓ | — | حالة | admin | `/api/water-supply-requests/` |
| الاقتراحات | `/Admin/requests/suggestions` | ✓ | — | ✓ | ✓ | مراجعة | admin | `/api/suggestions/` |
| الكفالات | `/Admin/sponsorships` | ✓ | ✓ (donor) | ✓ | — | approve/assign/deliver/complete/documentation | admin/staff/donor/supplier/rep | `/api/saqya/*` |
| الخرائط | `/Admin/maps` | ✓ | ✓ (admin) | ✓ | ✓ | طبقات/عناصر/حقول/مساهمات | admin/staff | `/api/maps/admin/*` |
| الكادر | `/Admin/staff` | ✓ | ✓ | ✓ | ✓ | تغذية اللوحة | orgStaff | `/api/dashboard/*` |
| تغذية الكادر | `/Admin/staff/manage` | ✓ | ✓ | ✓ | ✓ | أقسام/موظفون/مهام | orgStaff | `/api/dashboard/*` |
| التقارير | `/Admin/reports` | ✓ | — | — | — | إحصاءات | admin | `/api/admin/*` |

## الصفحات العامة (≤ نقرتين من الرئيسية)

| الصفحة | المسار | الدور | ملاحظات |
|-------|--------|------|---------|
| الرئيسية | `/` | public | مشاريع مميزة + روابط |
| المشاريع | `/projects` | public | فلترة بالنوع + بطاقات |
| صفحة مشروع | `/projects/:slug` | public | الأدوات المفعّلة فقط (النشطة) |
| خريطة مشروع | `/projects/:slug/map` | public | إن كانت الخريطة مفعّلة |
| كفالات مشروع | `/projects/:slug/sponsorships` | public/auth | بوابة الكفالات |
| المجمّع الموحّد للخرائط | `/map` | public | النشطة فقط |
| الخدمات | `/services` | public | — |
| طلب خدمة | `/request-service` | public | نموذج الطلب |
| سقيا الماء | `/services/water-supply` | public | مرتبطة بمشروع |
| التطوع | `/volunteers` | public | — |
| من نحن | `/about` | public | من الإعدادات |
| صفحة ثابتة | `/pages/:slug` | public | منشورة فقط |
| اقتراح | `/suggest` | public | — |
| دخول/تسجيل | `/signin`, `/signup` | public | بريد إلكتروني |
| 403 / 404 | `/403`, `/404`, `*` | public | صفحات مصمّمة |

## بوابة المتطوّع (User)

| الصفحة | المسار | الدور |
|-------|--------|------|
| الرئيسية | `/user/main` | auth |
| مهامي | `/user/tasks` | auth |
| معلوماتي | `/user/personal-info` | auth |
| الإعدادات (كلمة المرور + تفضيلات الإشعارات) | `/user/settings` | auth |

## قواعد عرضية مؤكّدة

- **الظهور العام = النشطة فقط**: `public_projects_queryset`، `maps.public_maps_index`، `maps._public_map_or_none` (D-43).
- **لا أزرار ميتة**: صفحة الهبوط تعرض الأدوات المفعّلة ذات الوجهة فقط؛ زر التبرع ضمن سياق الكفالات/الخدمات (D-45).
- **الخصوصية (PDPL)**: إخفاء `<5` وتجميعات فقط في الخرائط؛ لا PII في النقاط العامة (مؤكّد باختبارات `core.tests_consistency` و`maps`).
- **الصلاحيات**: كل كتابة إدارية جديدة `IsAdmin`/super-admin؛ القراءات العامة الجديدة (`public/project-types`) حقول آمنة فقط.
- **الإشعارات**: انتقالات دورة الحياة وأحداث المشروع/الطلبات/الكفالات/التطوع تُطلق إشعارات داخل المنصّة.
- **سجل النشاط**: append-only لإجراءات حسّاسة (مستخدمون/مشاريع/كفالات/إعدادات/بث/نشر/حالة المشروع).
- **التحويلات القديمة**: تُحلّ جميعها (`ACTIVE_LEGACY_REDIRECTS` + اختبار `LegacyRedirects`).
