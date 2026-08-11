# UAT — نموذج تقييم القبول (Phase A + B)

> فرع التجربة: `refactor/phase-b-ui` · التقارير: `FINAL_REPORT_PHASE_A.md` / `FINAL_REPORT_PHASE_B.md` · القرارات: `DECISIONS.md`  
> التقييم: ✅ ناجح / ⚠️ ملاحظة / ❌ فشل — النموذج التفاعلي: **http://localhost:3400/uat**

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

# الواجهة — منفذ التجربة 3400
cd frontend && npm run dev -- --port 3400 --host localhost
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
for u, r in [('uat_donor','donor'), ('uat_supplier','supplier'), ('uat_rep','representative'), ('uat_pm','user')]:
    user, _ = User.objects.get_or_create(username=u, defaults={'email': f'{u}@takaful.com'})
    user.set_password('Uat12345!'); user.email = f'{u}@takaful.com'; user.save()
    user.profile.role = r; user.profile.is_approved = True; user.profile.save()
pm = User.objects.get(username='uat_pm')
p = Project.objects.get(slug='tafaqqadhum')
ProjectMember.objects.update_or_create(project=p, user=pm, defaults={'role': 'project_admin'})
print('UAT users ready — password: Uat12345!')
"
```

> الدخول **بالبريد الإلكتروني** فقط.

---

## 1) الموقع العام

| # | السيناريو | المتوقع | التقييم | ملاحظات |
|---|---|---|---|---|
| 1.1 | `/` على :3400 | مقدّمة + مشاريع + أثر + خدمات؛ تبرع فقط مع donation_url | | |
| 1.2 | Navbar العام | الرئيسية/المشاريع/الخدمات/المتطوعون/الخرائط/من نحن — ≤2 نقرات | | |
| 1.3 | `/projects` | قائمة المنصّة + روابط الهبوط + CTA تبرع مشروط | | |
| 1.4 | صفحات `/projects/:slug` | أدوات مفعّلة فقط + تبرع مشروط | | |
| 1.5 | `/map` | مجمّع عام واحد | | |
| 1.6 | `/projects/tafaqqadhum/map` | خريطة المشروع فقط | | |
| 1.7 | تعهد من الخريطة | pending بنجاح | | |
| 1.8 | `/saqya` | → `/projects/saqya/sponsorships` | | |
| 1.9 | `/services/water-supply?project=saqya` | نموذج مرتبط بالمشروع | | |
| 1.10 | `/suggest` و`/request-service` | تعمل | | |

## 2) الدخول والتوجيه

| # | السيناريو | الدور | المتوقع | التقييم | ملاحظات |
|---|---|---|---|---|---|
| 2.1 | `/signin` | admin | → `/Admin` نظرة عامة | | |
| 2.2 | `/signin` | uat_pm | → `/Admin/projects` | | |
| 2.3 | مستخدم عادي | — | → `/user/main` | | |
| 2.4 | `/admin/signin` | — | → `/signin` | | |
| 2.5 | تسجيل جديد + JWT | — | بلا كسر | | |

## 3) سبعة نطاقات الإدارة

| # | السيناريو | الدور | المتوقع | التقييم | ملاحظات |
|---|---|---|---|---|---|
| 3.1 | `/Admin` | admin | 7 بطاقات KPI | | |
| 3.2 | الشريط الجانبي | admin | أسماء النطاقات العربية الموحّدة | | |
| 3.3 | `/Admin/projects` | admin | أدوات + donation_url | | |
| 3.4 | `/Admin/volunteers*` | admin | متطوعون/تطوع/انضمام | | |
| 3.5 | `/Admin/requests*` | admin | خدمات/سقيا/اقتراحات | | |
| 3.6 | `/Admin/sponsorships` | admin | محور الكفالات | | |
| 3.7 | `/Admin/maps` | admin | إدارة الخرائط فقط هنا | | |
| 3.8 | `/Admin/staff*` | admin | الكادر داخل AdminShell | | |
| 3.9 | `/Admin/reports` | admin | التقارير | | |
| 3.10 | صلاحيات uat_pm | uat_pm | نطاقه فقط؛ 403 لغيرها | | |

## 4) تحويلات المسارات القديمة

| # | من | إلى | التقييم | ملاحظات |
|---|---|---|---|---|
| 4.1 | `/Admin/map` | `/Admin/maps` | | |
| 4.2 | `/Admin/tasks` | `/Admin/projects/create` | | |
| 4.3 | `/Admin/ideas` | `/Admin/requests/suggestions` | | |
| 4.4 | `/Admin/applications` | `/Admin/volunteers/applications` | | |
| 4.5 | `/Admin/management` | `/Admin/volunteers` | | |
| 4.6 | `/Admin/service-requests` | `/Admin/requests` | | |
| 4.7 | `/Admin/executive` و`/executive` | `/Admin/staff` | | |
| 4.8 | `…/manage` التنفيذي | `/Admin/staff/manage` | | |
| 4.9 | `/saqya` | `/projects/saqya/sponsorships` | | |

## 5) الكفالات

| # | السيناريو | الدور | المتوقع | التقييم | ملاحظات |
|---|---|---|---|---|---|
| 5.1 | إنشاء كفالة | uat_donor | pending | | |
| 5.2 | اعتماد → إسناد | admin | assigned | | |
| 5.3 | تحضير → جاهز | uat_supplier | إشعار مندوب | | |
| 5.4 | تسليم + توثيق | uat_rep | ملف خاص | | |
| 5.5 | دفع يتجاوز المتبقي | uat_donor | رفض | | |
| 5.6 | اكتمال التمويل | — | in_progress | | |
| 5.7 | CTA تبرع من donation_url | — | يظهر/يُخفى حسب الإعداد | | |

## 6) الخرائط (إدارة من `/Admin/maps`)

| # | السيناريو | الدور | المتوقع | التقييم | ملاحظات |
|---|---|---|---|---|---|
| 6.1 | إنشاء خريطة | admin | تُنشأ | | |
| 6.2 | إنشاء خريطة | uat_pm | 403 | | |
| 6.3 | طبقة/حقول خاصة | admin/uat_pm | أدمن فقط | | |
| 6.4 | select غير صالح | — | 400 عربي | | |
| 6.5 | اعتماد تعهد | uat_pm | ملخص + إخفاء &lt;5 | | |
| 6.6 | نشر/إلغاء | admin | يظهر في `/map` | | |

## 7) سلامة البيانات

| # | السيناريو | المتوقع | التقييم | ملاحظات |
|---|---|---|---|---|
| 7.1 | `check_migration_integrity --expect migrated` | لا اختلالات | | |

---

## حسابات سريعة

| البريد | كلمة المرور | الدور |
|---|---|---|
| admin@takaful.com | admin123 | مشرف → `/Admin` |
| uat_pm@takaful.com | Uat12345! | مدير تفقدهم → `/Admin/projects` |
| uat_donor@takaful.com | Uat12345! | متبرّع |
| uat_supplier@takaful.com | Uat12345! | مورّد |
| uat_rep@takaful.com | Uat12345! | مندوب |
