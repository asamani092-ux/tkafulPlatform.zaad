# UX3 Phase 4 — ربط نماذج الطلبات + تعديل + مشاركة

## الهدف

ربط `RequestForm` المرتبط بمشروع بأداة «الخدمات» العامة، وتمكين تعديل النماذج من لوحة الإدارة، مع رابط عام فريد ورمز QR للمشاركة (بدون PII).

## 1. ربط النماذج بصفحة المشروع

### Backend

- **`backend/projects/tool_config.py`**: `request_form` يقبل أي slug غير فارغ يطابق `^[\w\-]+$` (ليس فقط `service` | `water_supply`). خيارات الواجهة القديمة بقيت كاقتراحات.
- **`backend/projects/serializers.py`**: حقل `request_forms` في `PublicProjectSerializer` — قائمة `{id, title, slug}` للنماذج النشطة المرتبطة بالمشروع.
- **`backend/projects/tests_tool_config.py`**: اختبار `RequestFormsPublicProjectTests` يتحقق من ظهور النموذج النشط في JSON التفاصيل العامة.

### Frontend

- **`toolLinks.ts`**: منطق `services`:
  - `water_supply` → `/services/water-supply?project=…`
  - `service` → `/request-service`
  - أي slug آخر → `/forms/:slug`
  - بدون إعداد: أول نموذج مرتبط من `requestForms`، أو fallback سقيا/خدمة.
- **`types.ts`**: `request_forms` على `PlatformProject` / `PublicProjectDetail`.
- **`ProjectLanding.tsx`**: عند أكثر من نموذج واحد وظهور أداة الخدمات، بطاقات إضافية بعنوان كل نموذج ورابط `/forms/:slug`.

## 2. واجهة التعديل (Edit)

- **`RequestFormsAdmin.tsx`**: زر «تعديل» يفتح نفس نافذة الإنشاء مع تعبئة مسبقة (عنوان، وصف، مشروع، حقول، حالة نشط).
- الحفظ عبر `PATCH /api/admin/request-forms/:id/` (title, description, project, fields_schema, is_active).
- إعادة تحميل القائمة بصمت (`silent`) بعد الحفظ.

## 3. المشاركة + QR

- زر «مشاركة» يعرض الرابط `${origin}/forms/${slug}` مع «نسخ الرابط».
- رمز QR يُولَّد client-side عبر `qrcode` → `<img alt="QR">` (لا بيانات شخصية في الرابط).
- تبعيات: `qrcode`, `@types/qrcode`.

## الاختبارات

| Suite | Result |
|-------|--------|
| `projects.tests_tool_config` | 11 passed |
| `services.tests_request_forms` | 5 passed |
| `npm test` (toolLinks) | 8 passed |
| `npm run build` | OK |

## الملفات المتأثرة

- `backend/projects/tool_config.py`
- `backend/projects/serializers.py`
- `backend/projects/tests_tool_config.py`
- `frontend/src/components/pages/projects/toolLinks.ts`
- `frontend/src/components/pages/projects/toolLinks.test.ts`
- `frontend/src/components/pages/projects/types.ts`
- `frontend/src/components/pages/projects/ProjectLanding.tsx`
- `frontend/src/components/pages/admin/RequestFormsAdmin.tsx`
- `frontend/package.json` / `package-lock.json`
