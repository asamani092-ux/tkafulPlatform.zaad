# UAT — نموذج تقييم القبول لكل الأدوات

> فرع: `refactor/project-first-architecture` · التقرير المرجعي الكامل: `FINAL_REPORT.md` · القرارات: `DECISIONS.md`
> التقييم: ✅ ناجح / ⚠️ ملاحظة / ❌ فشل — مع تدوين الملاحظة والمتصفح والدور المستخدم.

---

## 0) تجهيز بيئة التجربة (مرة واحدة)

```bash
# الباك إند
cd backend
./venv/bin/python manage.py migrate
./venv/bin/python manage.py create_admin            # admin@takaful.com / admin123
./venv/bin/python manage.py import_excel_data       # 13 مشروع تطوع + 2289 متطوعاً
./venv/bin/python manage.py seed_impact_map         # يشغّل sync_impact_map_to_maps تلقائياً
./venv/bin/python manage.py check_migration_integrity --expect migrated   # يجب: "لا اختلالات"
./venv/bin/python manage.py runserver 0.0.0.0:8000

# الواجهة (طرفية ثانية)
cd frontend && npm run dev                          # http://localhost:3000 (وليس 127.0.0.1)
```

حسابات أدوار إضافية للتجربة (donor / supplier / representative / project_admin):

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

> الدخول دائماً **بالبريد الإلكتروني** (وليس اسم المستخدم أو الجوال).

---

## 1) الزائر العام (بدون دخول)

| # | السيناريو | المتوقع | التقييم | ملاحظات |
|---|---|---|---|---|
| 1.1 | فتح `/` | قسم «مشاريع المنصّة» يعرض 3 مشاريع بألوان هويتها + الخدمات والإحصاءات | | |
| 1.2 | فتح `/projects/saqya` و`/projects/tafaqqadhum` و`/projects/takaful-athar` | صفحة هبوط لكل مشروع: الهوية + الأدوات المفعّلة فقط | | |
| 1.3 | فتح `/map` | المجمّع الموحّد: كل الطبقات العامة + فلترة «كل المشاريع/تفقدهم» | | |
| 1.4 | فتح `/projects/tafaqqadhum/map` | 20 عنصراً (12 منطقة + 8 منافذ)، فلاتر ديناميكية (النوع/الأولوية/نوع المنفذ/المنتج) | | |
| 1.5 | النقر على عنصر في الخريطة | بطاقة تفاصيل **بدون** «ساعات العمل (داخلي)» و«الأسر المستهدفة (داخلي)» | | |
| 1.6 | إرسال تعهد من الخريطة (اسم + 05XXXXXXXX + كمية) | «تم استلام تعهدكم بنجاح» وحالته pending | | |
| 1.7 | فتح `/saqya` القديم | تحويل تلقائي إلى `/projects/saqya/sponsorships` | | |
| 1.8 | نموذج سقيا المسجد `/services/water-supply` والاقتراحات `/suggest` | تعمل كما قبل إعادة الهيكلة | | |

## 2) أداة الكفالات (sponsorships)

| # | السيناريو | الدور | المتوقع | التقييم | ملاحظات |
|---|---|---|---|---|---|
| 2.1 | إنشاء كفالة | uat_donor | تُنشأ بحالة pending | | |
| 2.2 | اعتماد الكفالة → إسناد الطلب لمورّد ومندوب | admin | Order ينتقل pending→assigned | | |
| 2.3 | تحضير → جاهز | uat_supplier | إشعار للمندوب | | |
| 2.4 | تسليم + رفع توثيق بملف وGPS | uat_rep | يُرفع في مسار خاص ولا يُفتح إلا لمصرّح | | |
| 2.5 | دفع جزئي ثم محاولة دفع يتجاوز المتبقي | uat_donor | الثاني يُرفض «المبلغ يتجاوز المتبقّي» | | |
| 2.6 | اكتمال التمويل | — | الحالة تنتقل تلقائياً إلى in_progress | | |

## 3) أداة الخرائط (maps) — الأدمن

| # | السيناريو | الدور | المتوقع | التقييم | ملاحظات |
|---|---|---|---|---|---|
| 3.1 | `/Admin/maps`: إنشاء خريطة جديدة لمشروع | admin | تُنشأ (المشرف العام فقط) | | |
| 3.2 | نفس المحاولة | uat_pm | مرفوضة 403 (provisioning للمشرف العام) | | |
| 3.3 | إضافة طبقة خاصة + حقل `select` بخيارات + حقل غير عام | admin/uat_pm | تظهر في الأدمن ولا تظهر للعامة | | |
| 3.4 | إضافة عنصر من النموذج الديناميكي بقيمة select خارج الخيارات | — | رفض 400 برسالة عربية | | |
| 3.5 | اعتماد → تنفيذ تعهد (من 1.6) | uat_pm | الحالة تتغير والملخص العام يعكسها (مع إخفاء <5) | | |
| 3.6 | نشر/إلغاء نشر الخريطة | admin | تختفي/تظهر في `/map` العام | | |

## 4) لوحة الأدمن الموحّدة (role-scoped)

| # | السيناريو | الدور | المتوقع | التقييم | ملاحظات |
|---|---|---|---|---|---|
| 4.1 | `/Admin/projects` | admin | كل المشاريع + إنشاء مشروع + تفعيل أدوات + إدارة أعضاء | | |
| 4.2 | `/Admin/projects` | uat_pm (دخول عبر `/signin`) | مشروع «تفقدهم» فقط، بلا تبويبات المنصّة القديمة | | |
| 4.3 | `/Admin/maps` | uat_pm | خرائط «تفقدهم» فقط | | |
| 4.4 | `/Admin` و`/Admin/management` … | uat_pm | غير مرئية/403 (للمشرف العام فقط) | | |
| 4.5 | `/Admin/map` القديم | admin | تحويل تلقائي إلى `/Admin/maps` | | |

## 5) أدوات التطوع والخدمات والتقارير (بلا تغيير سلوكي)

| # | السيناريو | المتوقع | التقييم | ملاحظات |
|---|---|---|---|---|
| 5.1 | طلبات الانضمام/التطوع والقبول والمهام (`/Admin/*`, `/user/*`) | كما قبل إعادة الهيكلة | | |
| 5.2 | طلب خدمة عام + إدارتها | كما قبل | | |
| 5.3 | توليد تقرير شامل من `/Admin/reports` | يعمل | | |
| 5.4 | اللوحة التنفيذية `/executive` | تعمل | | |
| 5.5 | تسجيل مستخدم جديد + دخول/خروج JWT | بلا أي تغيير | | |

## 6) سلامة البيانات (يُنفَّذ في نهاية الجلسة)

```bash
cd backend && ./venv/bin/python manage.py check_migration_integrity --expect migrated
```

المتوقع: `سلامة البيانات مؤكدة — لا اختلالات`. أي اختلال = ❌ فوري وإيقاف التجربة.

---

**الحكم النهائي**: ☐ قبول ☐ قبول بملاحظات ☐ رفض · التوقيع: ________ · التاريخ: ________
