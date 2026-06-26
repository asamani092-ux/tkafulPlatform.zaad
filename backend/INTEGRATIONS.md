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

## إضافة المشروع الثالث (الاستعداد)
1. انسخ `analytics/management/commands/import_gas_data.py` إلى `import_<source>_data.py`.
2. عدّل `ROLE_MAP` ودوال `_import_*` بحسب أعمدة مصدر المشروع الثالث.
3. مرّر `--source <source>` ليُكتب في `external_source` (نطاق تتبّع منفصل عن `gas`).
4. لا حاجة لأي تغيير في المخطط أو الواجهات — البنية جاهزة للاستقبال.

> ملاحظة: استيراد البيانات الحقيقية من Google Sheets يتطلّب تصدير الأوراق إلى JSON
> بالصيغة أعلاه (أو إضافة قارئ مصدر مباشر في دالة `handle`).
