# UAT — نموذج تقييم القبول (ثلاث مراحل بالترتيب)

> **إجابات أسئلة المرحلة 1:** `docs/UAT_PHASE1_ANSWERS.md` · القرارات: `DECISIONS.md`  
> التقييم: ناجح / ملاحظة / فشل — النموذج التفاعلي: **http://localhost:3400/uat** (يتطلب `VITE_ENABLE_UAT=true`)

**مسار التجربة (بالترتيب — لا تخلط المراحل)**

| الترتيب | المرحلة | ماذا تفعل | أقسامها |
|--------|---------|----------|---------|
| 1 | الزائر ثم الدخول | تصفّح عام → دخول وتوجيه | 1 ثم 2 |
| 2 | المتطوّع ثم الإدارة | بوابة متطوّع → نطاقات الإدارة → تحويلات قديمة | 3 ثم 4 ثم 5 |
| 3 | الأدوات ثم السلامة | كفالات → خرائط → سلامة بيانات | 6 ثم 7 ثم 8 |

الترقيم متسلسل: أرقام السيناريو `س.ن` تتبع رقم القسم (1…8) دون قفزات.

---

## 0) تجهيز بيئة التجربة (مرة واحدة)

```bash
# الباك إند
cd backend
./venv/bin/python manage.py migrate
./venv/bin/python manage.py create_admin
./venv/bin/python manage.py import_excel_data
./venv/bin/python manage.py seed_impact_map
./venv/bin/python manage.py check_migration_integrity --expect migrated
./venv/bin/python manage.py runserver 0.0.0.0:8000

# الواجهة — منفذ التجربة 3400 + تفعيل نموذج UAT
cd frontend
echo 'VITE_ENABLE_UAT=true' > .env.development.local
npm run dev -- --port 3400 --host localhost
# افتح: http://localhost:3400  و  http://localhost:3400/uat
```

تأكد أن `backend/.env` يتضمن CORS للمنفذ 3400:

```
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,http://localhost:3400,http://127.0.0.1:3400
```

حسابات الأدوار:

```bash
cd backend && ./venv/bin/python manage.py shell -c "
from django.contrib.auth.models import User
from projects.models import Project, ProjectMember
for u, r in [('uat_donor','donor'), ('uat_supplier','supplier'), ('uat_rep','representative'), ('uat_pm','user'), ('uat_vol','user')]:
    user, _ = User.objects.get_or_create(username=u, defaults={'email': f'{u}@takaful.com'})
    user.set_password('Uat12345!'); user.email = f'{u}@takaful.com'; user.save()
    user.profile.role = r; user.profile.is_approved = True; user.profile.save()
pm = User.objects.get(username='uat_pm')
p = Project.objects.get(slug='tafaqqadhum')
ProjectMember.objects.update_or_create(project=p, user=pm, defaults={'role': 'project_admin'})
print('UAT users ready — password: Uat12345!  volunteer: uat_vol@takaful.com')
"
```

> الدخول **بالبريد الإلكتروني** فقط.

---

## المرحلة 1 — الزائر ثم الدخول

### 1) الموقع العام

| # | السيناريو | المتوقع | التقييم | ملاحظات |
|---|---|---|---|---|
| 1.1 | `/` على :3400 | مقدّمة + مشاريع + أثر + خدمات؛ تبرع فقط مع donation_url | | |
| 1.2 | Navbar العام | الرئيسية/المشاريع/الخدمات/المتطوعون/الخرائط/من نحن — ≤2 نقرات | | |
| 1.3 | `/projects` | قائمة المنصّة + روابط الهبوط + CTA تبرع مشروط | | |
| 1.4 | صفحات `/projects/:slug` | أدوات مفعّلة فقط + تبرع مشروط | | |
| 1.5 | `/map` | مجمّع عام واحد | | |
| 1.6 | `/projects/tafaqqadhum/map` | خريطة المشروع فقط | | |
| 1.7 | تعهد من الخريطة | pending بنجاح | | |
| 1.8 | `/saqya` | → `/projects/saqya` (هبوط)؛ الكفالات تتطلب دخولاً | | |
| 1.9 | `/services/water-supply?project=saqya` | نموذج مرتبط بالمشروع | | |
| 1.10 | `/suggest` و`/request-service` | تعمل | | |

### 2) الدخول والتوجيه

| # | السيناريو | الدور | المتوقع | التقييم | ملاحظات |
|---|---|---|---|---|---|
| 2.1 | `/signin` | admin | → `/Admin` نظرة عامة | | |
| 2.2 | `/signin` | uat_pm | → `/Admin/projects` | | |
| 2.3 | مستخدم عادي | — | → `/user/main` | | |
| 2.4 | `/admin/signin` | — | → `/signin` | | |
| 2.5 | تسجيل جديد + JWT | — | بلا كسر | | |

---

## المرحلة 2 — المتطوّع ثم الإدارة

### 3) بوابة المتطوّع

| # | السيناريو | المتوقع | التقييم | ملاحظات |
|---|---|---|---|---|
| 3.1 | `/user/main` بعد دخول uat_vol | غلاف المتطوّع وروابط المهام/المعلومات/الإعدادات | | |
| 3.2 | `/user/tasks` و`/user/personal-info` و`/user/settings` | تعمل داخل UserShell | | |
| 3.3 | `/Admin` بحساب متطوّع | رفض أو تحويل | | |

### 4) سبعة نطاقات الإدارة

| # | السيناريو | الدور | المتوقع | التقييم | ملاحظات |
|---|---|---|---|---|---|
| 4.1 | `/Admin` | admin | 7 بطاقات KPI | | |
| 4.2 | الشريط الجانبي | admin | أسماء النطاقات العربية الموحّدة | | |
| 4.3 | `/Admin/projects` | admin | أدوات + donation_url | | |
| 4.4 | `/Admin/volunteers*` | admin | متطوعون/تطوع/انضمام | | |
| 4.5 | `/Admin/requests*` | admin | خدمات/سقيا/اقتراحات | | |
| 4.6 | `/Admin/sponsorships` | admin | محور الكفالات | | |
| 4.7 | `/Admin/maps` | admin | إدارة الخرائط فقط هنا | | |
| 4.8 | `/Admin/staff*` | admin | الكادر داخل AdminShell | | |
| 4.9 | `/Admin/reports` | admin | التقارير | | |
| 4.10 | صلاحيات uat_pm | uat_pm | نطاقه فقط؛ 403 لغيرها | | |

### 5) تحويلات المسارات القديمة

| # | من | إلى | التقييم | ملاحظات |
|---|---|---|---|---|
| 5.1 | `/Admin/map` | `/Admin/maps` | | |
| 5.2 | `/Admin/tasks` | `/Admin/projects/create` | | |
| 5.3 | `/Admin/ideas` | `/Admin/requests/suggestions` | | |
| 5.4 | `/Admin/applications` | `/Admin/volunteers/applications` | | |
| 5.5 | `/Admin/management` | `/Admin/volunteers` | | |
| 5.6 | `/Admin/service-requests` | `/Admin/requests` | | |
| 5.7 | `/Admin/executive` و`/executive` | `/Admin/staff` | | |
| 5.8 | `…/manage` التنفيذي | `/Admin/staff/manage` | | |
| 5.9 | `/saqya` | `/projects/saqya` | | |

---

## المرحلة 3 — الأدوات ثم السلامة

### 6) الكفالات

| # | السيناريو | الدور | المتوقع | التقييم | ملاحظات |
|---|---|---|---|---|---|
| 6.1 | إنشاء كفالة | uat_donor | pending | | |
| 6.2 | اعتماد → إسناد | admin | assigned | | |
| 6.3 | تحضير → جاهز | uat_supplier | إشعار مندوب | | |
| 6.4 | تسليم + توثيق | uat_rep | ملف خاص | | |
| 6.5 | دفع يتجاوز المتبقي | uat_donor | رفض | | |
| 6.6 | اكتمال التمويل | — | in_progress | | |
| 6.7 | CTA تبرع من donation_url | — | يظهر/يُخفى حسب الإعداد | | |

### 7) الخرائط (إدارة من `/Admin/maps`)

| # | السيناريو | الدور | المتوقع | التقييم | ملاحظات |
|---|---|---|---|---|---|
| 7.1 | إنشاء خريطة | admin | تُنشأ | | |
| 7.2 | إنشاء خريطة | uat_pm | 403 | | |
| 7.3 | طبقة/حقول خاصة | admin/uat_pm | أدمن فقط | | |
| 7.4 | select غير صالح | — | 400 عربي | | |
| 7.5 | اعتماد تعهد | uat_pm | ملخص + إخفاء &lt;5 | | |
| 7.6 | نشر/إلغاء | admin | يظهر في `/map` | | |

### 8) سلامة البيانات

| # | السيناريو | المتوقع | التقييم | ملاحظات |
|---|---|---|---|---|
| 8.1 | `check_migration_integrity --expect migrated` | لا اختلالات | | |

---

## حسابات سريعة

| البريد | كلمة المرور | الدور |
|---|---|---|
| admin@takaful.com | admin123 | مشرف → `/Admin` |
| uat_pm@takaful.com | Uat12345! | مدير تفقدهم → `/Admin/projects` |
| uat_vol@takaful.com | Uat12345! | متطوّع → `/user/main` |
| uat_donor@takaful.com | Uat12345! | متبرّع |
| uat_supplier@takaful.com | Uat12345! | مورّد |
| uat_rep@takaful.com | Uat12345! | مندوب |
