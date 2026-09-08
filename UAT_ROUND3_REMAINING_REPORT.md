# UAT Round-3 Remaining Items — Closure Report

Branch: `cursor/uat3-remaining-clarity-069a`  
Gates: backend **308 OK** (1 skipped), vitest **182 passed**, `tsc --noEmit` clean, `dsAdoption` + `noRemount` guards green.

| Item | Classification | What was unclear/broken | What changed |
|------|----------------|-------------------------|--------------|
| **UAT 3.7 Maps admin clarity** | **Answered in UI** (+ light structure) | «مختلطة» / «التعهدات» وواجهة إدارة بدت خامّة | نصوص مساعدة في الواجهة: مختلطة = خريطة عامة مع طبقات خاصة لا تظهر للعموم؛ التعهدات = مساهمات الجمهور. مسار عمل مرقّم (طبقات → عناصر → حقول → ظهور/نشر → تعهدات)، حقول موسومة + `hint`، بطاقات/تنبيهات DS بدل صفوف خام |
| **UAT 3.9 Reports PDF** | **Functionally fixed** | `window.print()` ≈ لقطة/طباعة متصفح | محرّك `downloadArabicPdf` (jsPDF + autotable + Noto Naskh + reshape/bidi): نص عربي RTL قابل للتحديد. مربوط في `ReportGateway` و`Reports` |
| **UAT 3.2 Admin nav defaults** | **Functionally fixed** | عند `/Admin` بقي نطاق الإعدادات مفتوحاً من localStorage | الافتراضي على نظرة عامة: كل النطاقات مطوية؛ عند دخول نطاق يُفتح ذلك النطاق فقط |
| **UAT note #3 Volunteer area** | **Functionally fixed** (+ seed) | الواجهة مربوطة لكن غالباً فارغة بلا بيانات تجربة | تعزيز تحميل/عرض الإحصائيات والمهام في `Main`؛ أمر `seed_volunteer_demo` يملأ مهام/ساعات لـ `uat_vol@takaful.com`؛ التحقق API: stats + tasks غير فارغة |

## Answered in UI vs functionally fixed

- **Answered in UI:** 3.7 (معاني مختلطة/تعهدات + وضوح المسار).
- **Functionally fixed:** 3.9 PDF، 3.2 طي/توسيع الشريط، ملاحظة #3 بيانات المتطوع المعروضة.

## Non-goals / unchanged

- لم يُدمَج إلى `main` (التحقق اليدوي عندك).
- UAT 3.8 / 8.1 ما زالا خارج النطاق كما في مساءلة UX3B السابقة.
