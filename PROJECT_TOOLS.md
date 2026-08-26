# PROJECT_TOOLS.md — أدوات المشروع وإعداداتها

كل مشروع في المنصّة (`project-first`) يفعّل أدوات مستقلة عبر `ProjectTool(project, tool_key, config, is_enabled)`.
مصدر الحقيقة للمفاتيح المقبولة: `backend/projects/tool_config.py::TOOL_CONFIG_SCHEMA`، ويتم التحقق عند
`POST /api/platform/projects/<id>/set_tool/` (المشرف العام فقط). المفاتيح غير المعرّفة تُرفض (Scope Precision).

الظهور العام: صفحة هبوط المشروع والواجهات العامة تعرض **الأدوات المفعّلة فقط**، وبلا أزرار ميتة —
الأداة التي لا وجهة عامة لها لا تُعرض. تعطيل الأداة يخفيها ويخفي نقاط دخولها العامة فوراً.

## الأدوات والمفاتيح

| tool_key | الاسم | المفتاح | النوع | ملاحظات |
|----------|-------|---------|------|---------|
| `map` | الخريطة | `default_center` | `[lat, lng]` | مركز افتراضي؛ lat∈[-90,90]، lng∈[-180,180] |
| `map` | | `default_zoom` | int | 1..20 |
| `sponsorships` | الكفالات | `show_target_amount` | bool | إظهار المبلغ المستهدف |
| `sponsorships` | | `target_amount` | number ≥ 0 | المبلغ المستهدف للعرض |
| `volunteering` | التطوع | `show_opportunities` | bool | إظهار الفرص |
| `services` | الخدمات | `request_form` | `"service"` \| `"water_supply"` | نموذج الطلب المرتبط |
| `services` | | `show_request_button` | bool | إظهار زر تقديم الطلب |
| `reports` | التقارير | `public` | bool | أداة إدارية؛ لا تُعرض عامّاً كزر |

## الربط (Wiring) لكل أداة على صفحة الهبوط

- **map** → `/projects/<slug>/map` (يُعرض فقط إن وُجدت خرائط معلنة للمشروع).
- **sponsorships** → `/projects/<slug>/sponsorships`.
- **volunteering** → `/volunteers`.
- **services** → حسب `request_form`: `water_supply` → `/services/water-supply?project=<slug>`، وإلا نموذج
  الخدمة العام `/request-service` (هذا هو ربط ميزات الطلب/الخدمة للمشروع).
- **reports** → أداة إدارية (لوحة الكادر/التقارير)، لا وجهة عامة، فلا تظهر كبطاقة عامة.

## زر التبرع (Donation CTA)

- يبقى لكل مشروع عبر `donation_url` (+ `donation_label`).
- يظهر في سياق الأدوات فقط: عندما يكون `donation_url` غير فارغ **و** الأداة `sponsorships` أو `services` مفعّلة.
- يختفي كلياً عند غياب الرابط.

## التحقق من الخادم

`set_tool` يستدعي `validate_tool_config(tool_key, config)`:
- يرفض المفاتيح غير المعرّفة (400).
- يتحقق من نوع/نطاق كل قيمة (bool/int/number/str/latlng)، مع قيود خاصة
  (`default_zoom` 1..20، `target_amount` ≥ 0، `request_form` ضمن الخيارات).
