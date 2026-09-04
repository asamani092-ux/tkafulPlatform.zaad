# CFG_PHASE_4_REPORT — بذرة زاد + وثائق + E2E ثنائي + تسليم

## التسليم
- أمر `seed_zaad_config` (idempotent): يضبط كتلة PlatformSetting + يزرع SponsorshipStatus
- `CONFIGURATION.md`: كل إعداد، أثره، قيمة زاد، مسار الترقية لـ Organization
- تحديث `FEATURE_MATRIX.md` و`PERMISSION_TABLE.md`
- E2E1 (زاد): بذرة، رفض دخول donor، تسجيل مشرف مجتمعي، حالات مخصّصة، رفض مال/PII، إحصاءات `<5`
- E2E2 (تصدير): مدفوعات On + donor login → إنشاء ودفع ومنع overfund

## التحقق
```
manage.py seed_zaad_config
manage.py test sponsorships.tests_configurable_phase4_e2e  # 5 OK
```

## طلب السحب
عنوان: `feat: configuration-driven sponsorship & platform model`  
مسارات التقارير: `CFG_PHASE_1_REPORT.md` … `CFG_PHASE_4_REPORT.md`  
**بدون دمج.**

## مبدأ ثابت
تهيئة لا حذف — بوابات المال والبوابات GPS تبقى في الشجرة خلف أعلام.
