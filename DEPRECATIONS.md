# قائمة العناصر المؤجَّلة للحذف (Deprecations)

قاعدة: **لا حذف الآن.** هذه العناصر مكرّرة أو غير مستخدمة، لكنها تبقى للرجوع حتى
**اكتمال دمج المشروع الثالث والتأكد من استقرار المنصة**. عند الجاهزية تُحذف في دفعة منفصلة.

## واجهة (Frontend)
- `frontend/src/legacy/` — أرشيف كامل للواجهة القديمة (قبل اعتماد Design_system_f). مستثنى من tsc وغير مرتبط بالتوجيه.
- `frontend/src/legacy/saqya/` — أرشيف مصدر المشروع الثالث (JSX + توثيق) كمرجع منطق فقط؛ أُعيد بناؤه بـ Design_system_f/TS في وحدة saqya.
- `Sidebar.jsx` (جذر المستودع) — ملف يتيم غير مُستورَد.
- `package.json` (جذر المستودع) — يحوي `dompurify`/`validator` فقط؛ التبعيات الفعلية في `frontend/`. شبه فارغ/مكرّر.

## خلفية (Backend)
- `takaful_app.views.LoginView` و`RegisterView` — **أُزila من الكود** (كانت غير مربوطة؛ المصادقة في `accounts`).
- المسار `volunteers-old/` — **أُزيل من التوجيه** (كان `VolunteerViewSet` + `IsAdmin`). النموذج `Volunteer` ما زال في ORM حتى ترحيل البيانات.
- `takaful_backend.urls` — **أُزيل** التضمين المكرر `path("api/admin/", include("takaful_app.urls"))`؛ البادئة الموحّدة `/api/` فقط.

## Design_system_f
- `Design_system_f/uploads/design-system/*.ps1` (4 سكربتات ويندوزية) — غير مستخدمة في بيئة Linux/CI.
- المسار القديم `design-system/` (جذر المستودع) — محذوف؛ المصدر الوحيد `Design_system_f/uploads/design-system/`.

## إجراءات ما قبل الحذف (لاحقاً)
1. تأكيد عدم وجود مراجع حيّة (grep) لكل عنصر.
2. ترحيل أي بيانات من `Volunteer` إلى `User`+`Profile`.
3. حذف ضمن PR مستقل مع اختبارات خضراء.
