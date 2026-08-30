# FEATURE_MATRIX.md — Takaful wa Athar

مصدر حقيقة واحد لجولة `/uat` التالية (بعد UAT Fix Phases 1–5).  
الأدوار: **admin** = المشرف العام، **staff** = عضو مشروع (project_admin/editor/viewer)،  
**orgStaff** = admin/manager/employee، **auth** = مسجّل، **public** = بلا مصادقة.

## أدوات الإدارة الأفقية

| الأداة | المسار | قائمة | إنشاء | تعديل | حذف | إجراءات | الدور | API |
|-------|--------|:----:|:----:|:----:|:---:|---------|------|-----|
| نظرة عامة | `/Admin` | ✓ | — | — | — | روابط النطاقات | admin | — |
| المستخدمون | `/Admin/users` | ✓ | ✓ | ✓ | ✓ | set_role, set_active, city | admin | `/api/accounts/users/` |
| إعدادات المنصّة | `/Admin/settings` | ✓ | — | ✓ | — | حفظ + صفحات ثابتة | admin | `/api/settings/` |
| بث إشعار | `/Admin/settings/broadcast` | — | ✓ | — | — | broadcast | admin | `/api/notifications/broadcast/` |
| الأدوار | `/Admin/settings/roles` | ✓ | — | — | — | قراءة | admin | `/api/roles/` |
| سجل النشاط | `/Admin/settings/activity` | ✓ | — | — | — | فلترة append-only | admin | `/api/activity-logs/` |
| أنواع المشاريع | `/Admin/settings/project-types` | ✓ | ✓ | ✓ | ✓ | تفعيل/تعطيل | admin | `/api/platform/project-types/` |

## نطاقات العمل (بعد D-47…D-51)

| النطاق | المسار | قائمة | إنشاء | تعديل | حذف | إجراءات | الدور | API |
|-------|--------|:----:|:----:|:----:|:---:|---------|------|-----|
| المشاريع | `/Admin/projects` | ✓ | ✓ (admin فقط، داخل الصفحة) | ✓ | ✓ (admin) | دورة حياة، أدوات، أعضاء، فهرس كفالات | admin/staff | `/api/platform/projects/` |
| إنشاء مشروع (توافق) | `/Admin/projects/create` | — | →projects | — | — | تحويل | admin | — |
| المتطوعون | `/Admin/volunteers` | ✓ | ✓ | ✓ | ✓ | بحث، تعليق، تقرير إنجاز | admin | `/api/volunteers/`, `/api/accounts/users/` |
| طلبات المشاريع | `/Admin/volunteers/applications` | ✓ | — | — | — | قبول/رفض | admin | `/api/admin/applications/` |
| طلبات الانضمام | `/Admin/volunteers/join-requests` | ✓ | — | — | — | قبول/رفض | admin | `/api/volunteer-requests/` |
| الطلبات (نماذج) | `/Admin/requests/forms` | ✓ | ✓ | ✓ | ✓ | ربط بمشروع، إرسالات، حالة | admin | `/api/admin/request-forms/`, `…/request-submissions/` |
| طلبات قديمة (توافق) | `/Admin/requests`, `…/water-supply`, `…/suggestions` | — | — | — | — | → `/Admin/requests/forms` | admin | جداول قديمة + مرآة |
| الكفالات (فهرس) | داخل `/Admin/projects` | ✓ | — | — | — | رابط `/projects/:slug/sponsorships` | admin/staff | `/api/saqya/*` عبر البوابة |
| الكفالات (توافق) | `/Admin/sponsorships` | — | — | — | — | → projects | — | — |
| الخرائط | `/Admin/maps` | ✓ | ✓ | ✓ | ✓ | طبقات/عناصر/حقول/تعهدات/نشر | admin/staff+map | `/api/maps/admin/*` |
| التقارير | `/Admin/reports` | ✓ | ✓ توليد | — | ✓ | عرض، CSV، طباعة، أداء، تقدّم | admin | `/api/reports/` |
| أداء الكادر | `/Admin/staff` | ✓ | — | — | — | لوحة تنفيذية | orgStaff | `/api/dashboard/*` |
| تغذية الكادر | `/Admin/staff/manage` | ✓ | ✓ | ✓ | ✓ | أقسام/موظفون/مهام | orgStaff | `/api/dashboard/*` |

## الصفحات العامة

| الصفحة | المسار | الدور | ملاحظات |
|-------|--------|------|---------|
| مشاريع عامة | `/api/platform/public/projects/`, `/api/public-projects/` | public | **active فقط** (D-43/D-48) |
| نماذج ديناميكية | `/forms/:slug`, `/api/public-forms/` | public | بلا PII إرسالات |
| كفالات مشروع | `/projects/:slug/sponsorships` | public/auth | دورة تشغيلية |
| مجمّع خرائط | `/map` | public | مشاريع نشطة + إخفاء &lt;5 |

## قواعد عرضية

- الظهور العام = `status=active` + `is_active` (+ غير مخفي للتطوّع).
- مدير المشروع (uat_pm): مشاريع/خرائط في نطاق عضويته؛ 403 على users/volunteers/requests/reports/settings/activity.
- الخصوصية: لا PII في النقاط العامة؛ إرسالات الطلبات IsAdmin فقط.
- التحويلات: `ACTIVE_LEGACY_REDIRECTS` + اختبارات LegacyRedirects.
- خارج هذه الجولة (23 بنداً): دورة كفالات 5.x، خرائط 6.x، سلامة بيانات 7.1.
