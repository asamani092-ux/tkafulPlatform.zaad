# تقرير المرحلة 1 — أنواع الكفالات الديناميكية

## الملخص

أُضيف نموذج `SponsorshipType` مرتبط بالمشروع مع مخطط حقول JSON بنفس عقد نماذج الطلبات، وحقلان على `Sponsorship`: `sponsorship_type` (قابل للإلغاء) و`type_data`. عند الربط يُملأ `type` باسم النوع للتوافق الخلفي. مدير الأنواع في تبويب لوحة الكفالات الإدارية، ونموذج المتبرّع يختار النوع ويرسم الحقول ديناميكياً.

## الخلفية

| عنصر | تفاصيل |
|------|--------|
| وحدة مشتركة | `backend/core/dynamic_fields.py` — `validate_fields_schema` / `validate_submission` / `public_fields_only` |
| نموذج | `SponsorshipType` (`project`, `name`, `slug` تلقائي unicode فريد لكل مشروع، `description`, `is_active`, `order`, `fields`) |
| كفالة | `sponsorship_type` FK `SET_NULL` + `type_data` JSON؛ `type` CharField يبقى |
| API | `GET/POST/PATCH/DELETE /api/saqya/sponsorship-types/?project=<slug>` |
| هجرة | `sponsorships/migrations/0004_sponsorship_type_and_type_data.py` قابلة للعكس؛ الكفالات الحالية `sponsorship_type=null` |
| تحقق | كتابة الكفالة تتحقق من `type_data` ضد `sponsorship_type.fields` |

## الواجهة

| عنصر | تفاصيل |
|------|--------|
| بنّاء حقول مشترك | `frontend/src/components/admin/FieldSchemaBuilder.tsx` (+ معاينة وإدخال ديناميكي) |
| مدير الأنواع | `SponsorshipTypesPanel` داخل تبويب «أنواع الكفالات» في `AdminPortal` عند وجود `projectSlug` |
| المتبرّع | `DonorPortal` يستقبل `projectSlug`، يحمّل الأنواع النشطة، يرسل `sponsorship_type` + `type_data` |
| قيود UX | بلا JSON خام وبلا طلب slug من المستخدم |

## بوابة الاختبار

- `sponsorships.tests_sponsorship_types` — CRUD، تحقق الحقول، كفالة مع/بدون نوع، ملء `type`، بقاء null للقديم
- `sponsorships` + `core.tests_security` — حماية التمويل ما زالت خضراء
- `npm run build` (tsc + vite) أخضر
- `manage.py check` نظيف

## التعقيد

- توليد slug فريد ضمن مشروع: O(k) محاولات
- تحقق مخطط/إرسال: O(f) لعدد الحقول
- قائمة الأنواع للمتبرّع: O(t) مُصفّاة بـ `is_active`
