# تقرير المرحلة 2 — إعدادات أداة الكفالات ونطاق الإسناد

## الملخص

توسيع `TOOL_CONFIG_SCHEMA` لأداة الكفالات بمفاتيح عرض/CTA عربية، وإضافة جداول M2M لنطاق المورّد/المندوب على المشروع مع فرض خادمي في `assign` (قائمة فارغة = بلا قيد)، وتصفية قوائم الإسناد في `AdminPortal`، واحترام `show_donation_cta` ورابط التبرع في واجهة المشروع.

## الخلفية

| عنصر | تفاصيل |
|------|--------|
| مفاتيح جديدة | `show_description`, `show_location`, `show_public_type_fields`, `show_donation_cta` (+ الإبقاء على `show_target_amount` / `target_amount`) |
| مخطط واجهة | `TOOL_CONFIG_UI` بتسميات/تلميحات عربية؛ `ToolConfigFields` يلتقطها تلقائياً عبر `/api/platform/tool-config-schema/` |
| M2M | `ProjectAllowedSupplier` / `ProjectAllowedRepresentative` — هجرة `0006_project_allowed_supplier_rep` |
| API مشروع | `allowed_supplier_ids` / `allowed_representative_ids` على مسلسل الإدارة (مزامنة عند PATCH) |
| فرض إسناد | `OrderViewSet.assign`: إن وُجدت قائمة غير فارغة يُرفض `supplier_id` / `representative_id` خارجها |

## الواجهة

| عنصر | تفاصيل |
|------|--------|
| CTA تبرع | `donationInContext` يحترم `show_donation_cta` ويخفي الزر دائماً عند غياب `donation_url` |
| إسناد | `AdminPortal` يصفّي المورّدين/المندوبين حسب نطاق المشروع |
| إدارة النطاق | اختيار متعدد في `PlatformProjects` لمشاريع فيها أداة كفالات |
| عرض متبرّع | `DonorPortal` يقرأ `tool_config.sponsorships` لإخفاء الوصف عند `show_description === false` |

## بوابة الاختبار

- `sponsorships.tests_assign_allowlist` — قائمة فارغة تسمح / غير فارغة ترفض الخارجين
- `projects.tests_tool_config` — قبول المفاتيح الجديدة وتطابق `schema_payload`
- vitest `toolLinks.test.ts` أخضر (يشمل إخفاء CTA)
- `npm run build` أخضر

## التعقيد

- فرض الإسناد: O(1) بعد جلب معرّفات المسموحين (استعلامان محدودان)
- مزامنة النطاق: O(n) حذف+إدراج لمعرّفات القائمة
- تصفية قوائم الواجهة: O(s + r)
