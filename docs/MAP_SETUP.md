# تشغيل خرائط الأثر (1.5 و 1.6)

## المتطلبات
- الباك إند يعمل على `:8000`
- مشروع `tafaqqadhum` موجود (`migrate` + بذر المشاريع)

## الخطوات (مرة واحدة لكل بيئة)

```bash
cd backend
./venv/bin/python manage.py migrate
./venv/bin/python manage.py seed_impact_map
```

## التحقق

```bash
curl -s http://127.0.0.1:8000/api/maps/public/?project=tafaqqadhum | head -c 400
```

يجب أن يُرجع مصفوفة فيها خريطة واحدة على الأقل.

## في المتصفح

| السيناريو | الرابط |
|-----------|--------|
| 1.5 مجمّع المنصّة | http://localhost:3400/map |
| 1.6 خريطة المشروع | http://localhost:3400/projects/tafaqqadhum/map |

## ملاحظات
- الأمر **idempotent** — إعادة التشغيل لا تكرّر البيانات.
- بدون `seed_impact_map` تظهر «لا توجد خرائط منشورة».
- التعهد العام من الخريطة **أُزيل** من الواجهة العامة (قرار UAT).
