# دليل دمج المشاريع في المنصة الموحّدة (Integration Contract)

هذا الدليل يوثّق نمط استيراد مصادر خارجية (المشروع الثاني GAS، والمشروع الثالث لاحقاً)
إلى المنصة الموحّدة، بطريقة **تراكمية idempotent** لا تكسر البيانات أو الواجهات القائمة.

## المبدأ
كل النماذج القابلة للدمج تملك حقلَي تتبّع:
- `external_source` (مثل `gas`, `projectX`)
- `external_id` (المعرّف في النظام المصدر)

الاستيراد يستخدم `update_or_create(external_source, external_id)` فلا يكرّر السجلات
عند إعادة التشغيل، ويسمح بالمزامنة الدورية مع الحفاظ على المعرّفات الداخلية المستقرة.

النماذج المهيّأة: `Profile`, `Project`, `analytics.Employee`, `analytics.DashboardSection`,
`analytics.DashboardKpi`, `analytics.StaffTask` (و`notifications.Notification` عبر ربط المستخدم).

## صيغة ملف التصدير (JSON) — المشروع الثاني (GAS)
```jsonc
{
  "users":         [{ "id": 1, "name": "...", "email": "...", "role": "admin|manager|...", "password": "...", "status": "active" }],
  "projects":      [{ "id": 10, "name": "...", "status": "ACTIVE", "manager": "اسم الموظف", "progress": 72, "startDate": "2026-03-01", "endDate": "2026-04-30", "budget": 150000 }],
  "sections":      [{ "id": 1, "title": "...", "unit": "نشاطًا", "total": 50, "actual": 60, "expected": 90, "closed": 20, "inProgress": 10, "near": 5, "late": 2, "review": 1, "notStarted": 12 }],
  "employees":     [{ "id": 1, "name": "...", "role": "...", "completed": 15, "progress": 90 }],
  "tasks":         [{ "id": 1, "task": "...", "owner": "اسم الموظف", "initiative": "...", "date": "2026-04-16", "progress": 100 }],
  "kpis":          [{ "id": 1, "title": "...", "value": "268", "subtitle": "..." }],
  "notifications": [{ "id": "N-1", "userId": 2, "message": "...", "status": "unread" }]
}
```

## التشغيل
```bash
python manage.py import_gas_data --file /path/to/gas_export.json          # source=gas (افتراضي)
python manage.py seed_executive_dashboard                                  # بذور افتراضية (بدون ملف)
```

## الأمان (المستخدمون)
- كلمات المرور تُجزّأ عبر `set_password` (لا تُخزَّن نصّاً صريحاً أبداً).
- يُضبط `must_reset_password=True` فيُجبر المستخدم على التغيير عند أول دخول
  عبر `POST /api/accounts/change-password/`.
- أدوار المصدر غير المعروفة تُعيَّن إلى `employee` افتراضياً (ROLE_MAP قابل للتعديل).

## طبقة التكامل الموحّدة (integrations)
يوجد الآن تطبيق `integrations` يحوي `BaseImporter` (في `backend/integrations/base.py`)
كموطن موحّد لمستوردات المصادر الخارجية. يوفّر `upsert(model, external_id, defaults)`
idempotent معتمداً على `(external_source, external_id)`.

## إضافة المشروع الثالث (الاستعداد)
الطريقة الموصى بها (طبقة integrations):
1. أنشئ `backend/integrations/<source>_importer.py` يرث `BaseImporter` ويضبط `source="<source>"`.
2. نفّذ `run(data)` مستخدماً `self.upsert(Model, external_id, defaults=...)` لكل كيان.
3. أضف أمر إدارة رفيعاً يقرأ ملف/مصدر المشروع الثالث ويستدعي `run`.

الطريقة البديلة (نسخ المستورد الحالي):
1. انسخ `analytics/management/commands/import_gas_data.py` إلى `import_<source>_data.py`.
2. عدّل `ROLE_MAP` ودوال `_import_*` بحسب أعمدة المصدر، ومرّر `--source <source>`.

لا حاجة لأي تغيير في المخطط أو الواجهات — حقول `external_source/external_id` في كل النماذج جاهزة.

> ملاحظة: استيراد البيانات الحقيقية من Google Sheets يتطلّب تصدير الأوراق إلى JSON
> بالصيغة أعلاه (أو إضافة قارئ مصدر مباشر).

## المشروع الثالث: «كفالات السقيا» (saqya) — مدموج
- وحدة `saqya` مستقلة (مترجمة من Flask/SQLAlchemy إلى Django/DRF) بمصادقة SimpleJWT موحّدة وأدوار `supplier/representative/donor`.
- الاستيراد: `python manage.py import_saqya_data --file export.json` (يرث `BaseImporter`, `source="saqya"`، idempotent).
- **استراتيجية الدمج (المستخدمون):** المطابقة بـ email أو phone مع مستخدم موحّد قائم → دمج الملف (تعبئة الناقص دون استبدال) وربط الكفالات بالمستخدم الحالي؛ وإلا إنشاء جديد بـ `must_reset_password=True` (صيغ hash مختلفة).
- **جسر اختياري (لاحقاً):** يمكن ربط `takaful_app.WaterSupplyRequest` (طلب مسجد عام) بإنشاء `saqya.Sponsorship` مقابل عند الاعتماد — يبقى التطبيقان مستقلَّين حالياً (لا مساس بـ WaterSupplyRequest).

## خريطة المظلّة «تكافل وأثر» (بنية التطبيقات)
- `accounts` — الهوية والمصادقة (User + Profile، الأدوار: admin/manager/employee/user/beneficiary).
- `takaful_app` — نطاق المشروع الأول: المشاريع/الخدمات/التطوع/المهام/الطلبات/الإحصائيات/التقارير.
- `analytics` — اللوحة التنفيذية (المشروع الثاني): الأقسام/الموظفون/المهام/الـ KPIs.
- `notifications` — الإشعارات (عابرة).
- `integrations` — استقبال المصادر الخارجية (محوّلات الاستيراد).
- `saqya` — كفالات السقيا (المشروع الثالث): متبرّع/مورّد/مندوب/مشرف + كفالات/طلبات/فواتير/مدفوعات/توثيق.
- `core` — مشترك (health/throttles).

تجميع تجربة المستخدم تحت المظلّة:
- عام: `/`, `/projects`, `/services`, `/volunteers`, `/about`, نماذج عامة.
- التنفيذية: `/executive`, `/executive/manage`.
- الإدارة: `/Admin/*`.
- المتطوّع: `/user/*`.
- (مشروع ثالث لاحقاً: مسارات/تطبيق جديد يُدمج بنفس النمط.)
