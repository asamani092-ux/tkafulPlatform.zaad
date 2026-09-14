# UX2 — تقرير المرحلة 1: تبنّي نظام التصميم (RC-A)

**الفرع:** `feat/adopt-design-system` · **الأساس:** `main`

## المشكلة الجذرية
نظام التصميم `@zaad/design-system` (v1.2.11) كان مُعتمَداً على مستوى التوكنات و CSS فقط،
بينما تبني شاشات الإدارة عناصر HTML خام (`<input>`/`<button>`/`<textarea>`) بلا تسمية،
فبدت الواجهة بدائية وجامدة وحقولها غير معنونة.

## ما أُنجز
### أغلفة جديدة مطابقة لعقود `components.md`
| المكوّن | العقد | ملاحظات |
|---|---|---|
| `Textarea` | §1.2 TextField | تسمية عربية إلزامية + `aria-describedby` للخطأ/التلميح |
| `Checkbox` | §1.6 | تسمية قابلة للنقر، هدف لمس ≥ 44px |
| `Switch` | §1.5 | `role=switch` + `aria-checked` + انزلاق المقبض |
| `MultiSelect` | §1.4 | اختيار متعدد قابل للبحث بوسوم (لمرحلة الأعضاء) |
| `Panel` | §2.3 | لوح قابل للطي — **مضغوط افتراضياً** |
| `Alert` | §1.9 | لون + أيقونة + نص؛ `role=alert/status` حسب الخطورة |
| `Spinner` | §1.12 | `role=status` + `aria-live` |

### تحسين الأغلفة القائمة
- `Button`: أضيفت المتغيّرات `ghost/danger/accent` والمقاسات `sm/md/lg` و`iconOnly` و`loading` (`aria-busy`) — **دون تغيير الواجهة العامة القائمة** (متوافق مع الاستدعاءات السابقة).
- `Input`/`Select`: توليد `id` تلقائي عبر `useId` لضمان ربط التسمية دائماً + `aria-invalid`.

### استبدال العناصر الخام في الإدارة (وأصداف مشتركة)
`PlatformSettings` (Switch/Checkbox/Textarea) · `BroadcastAdmin` (Textarea/Input) ·
`UsersAdmin` (Checkbox) · `RequestFormsAdmin` (Checkbox + أزرار DS) · `MapsAdmin` (Checkbox + أزرار DS) ·
`PlatformProjects` (Textarea معنون لإعداد الأداة) · `Reports` (أزرار DS) ·
`VolunteersAdmin` (‏`aria-label` صريح لأزرار الأيقونات) · `DonorPortal` (Textarea).

## البوّابة (Gate)
- ✅ `tsc && vite build` أخضر (حزمة admin ‎113 kB).
- ✅ Vitest: **80/80** (منها حارس جديد `dsAdoption.test.ts`).
- ✅ الخلفية: `manage.py check` نظيف + مجموعة الاختبارات `OK (skipped=1)`.
- ✅ حارس: لا عنصر `<input>`/`<select>`/`<textarea>` خام في `pages/admin/**` (فحص حساس لحالة الأحرف).

## ملاحظات
- لوحات المشاريع/الخرائط/التقارير تُعاد هيكلتها وظيفياً في المرحلة 4 مع `Panel` المطوي و`MultiSelect`؛
  هنا اقتُصر على امتثال العقود (تسمية + أزرار + طي).
