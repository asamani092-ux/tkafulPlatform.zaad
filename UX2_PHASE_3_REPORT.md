# UX2 — تقرير المرحلة 3: توحيد الأدوار + نطاق الكادر (RC-C)

**الفرع:** `fix/role-vocab-staff` · **الأساس:** `fix/auth-nav-root-cause`

## المشكلة الجذرية
- تشعّب مفردات الأدوار: مسارات `/Admin/staff` كانت تستخدم `requiredRole="orgStaff"`
  (فحص دور) بينما بقية النطاقات تستخدم `staff` عبر `canAccessAdminPath` (عضوية/نطاق)،
  فبدت البوابة غير متسقة (UAT 3.8).
- `ExecutiveDashboard` كان يجلب `/api/dashboard/executive/` بـ `fetch` خام بلا توكن،
  وعند غياب البيانات يعرض شبكات فارغة تبدو كشاشة «غير موجود».

## ما أُنجز
### بوابة موحّدة (admin ⊇ orgStaff ⊇ staff)
- `access.ts`: أُضيف `ORG_STAFF_ROLES` و`isOrgStaff`، ونطاق الكادر
  (`/admin/staff`, `/admin/executive`) يُسمح لـ manager/employee والمشرف مشمول
  عبر تجاوز `isGlobalAdmin`.
- `ProtectedRoute`: `staff` و`orgStaff` يمرّان الآن عبر **`StaffGate` واحد**
  (‏`canAccessAdminPath`) — أُزيل الفحص المزدوج ومصفوفة الأدوار المكرّرة.

### إصلاح شاشة الكادر الميتة
- `ExecutiveDashboard` يستخدم `authFetch` (توكن صحيح).
- عند غياب كل البيانات (أقسام/موظفون/مهام/مؤشرات) تظهر **حالة فراغ واضحة**
  مع زر «فتح تغذية اللوحة» بدل شبكات فارغة صامتة.

## البوّابة (Gate)
- ✅ Vitest: **87/87** (اختبارات جديدة: المشرف يصل للكادر · manager/employee يصلون ·
  عضو المشروع لا يصل · لا وصول للنطاقات الخاصة بالمشرف).
- ✅ الخلفية: `manage.py check` نظيف + `analytics` 5/5 `OK`.
- ✅ `tsc && vite build` أخضر.

## تحقّق النطاق (uat_pm — 3.10)
`buildAdminAccess("user", …, [membership])` يمنح المشاريع/الخرائط ضمن الأدوات فقط،
ويمنع المستخدمين/الطلبات/التقارير/الإعدادات/الكادر (مؤكّد باختبارات `access.test.ts`).
