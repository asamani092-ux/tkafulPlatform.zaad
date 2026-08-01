# التقرير النهائي — refactor: project-first architecture + multi-map system

> هذا الملف هو وصف الـ PR الجاهز. الفرع: `refactor/project-first-architecture` ← `main`.

---

## 1) ملخص التصميم كما نُفّذ

### تطبيقات Django المضافة
| التطبيق | النماذج | الدور |
|---|---|---|
| `projects` | `Project`, `ProjectMember`, `ProjectTool` | الكيان الأول + العضويات + الأدوات (config JSON) |
| `maps` | `Map`, `MapLayer`, `MapItem`, `MapItemField`, `MapContribution` | خرائط قابلة للتهيئة، طبقات بظهور مستقل، مخطط حقول ديناميكي |
| `sponsorships` | نماذج saqya السبعة + FK `project` | منقول من `saqya` (state-only، الجداول `saqya_*` نفسها) |
| `volunteering` | نماذج takaful_app الـ16 | منقول من `takaful_app` (state-only، الجداول `takaful_app_*` نفسها) |

`accounts`, `analytics`, `notifications`, `core`, `integrations` كما هي (باستثناء هجرة حالة واحدة في analytics لإعادة توجيه FK).

### الصلاحيات
- الأدوار العالمية **لم تتغير**؛ super-admin = `profile.role == "admin"` (لا دور جديد — D-06).
- مستوى المشروع عبر `ProjectMember` (project_admin / project_editor / project_viewer).
- إنشاء/حذف المشاريع وتجهيز الخرائط (provisioning): المشرف العام فقط.
- الصلاحية المركزية `IsAdmin` وُحّدت في `core/permissions.py` (D-11).

### إنفاذ الظهور المختلط
- **فلتر مركزي واحد**: `maps/services.py::filter_public_item_payload` + `build_public_map_detail` — الطبقات `visibility=public` والحقول `is_public=True` فقط، بلا أي فلترة لكل endpoint.
- إخفاء PDPL `<5` محفوظ في `maps.services.mask_small_count` ومطبَّق على التجميعات.
- كل كتابة على `MapItem.data` تمر بـ `validate_item_data` (نوع/إلزامية/خيارات select/رفض المفاتيح غير المعرّفة).

### خطة الهجرة كما نُفّذت (التسلسل الإلزامي)
1. **نسخ احتياطي**: `deploy/backup.sh` (SQLite + PostgreSQL) — مُنفَّذ وموثّق.
2. **ثلاثة مشاريع أساسية**: «كفالات السقيا» (saqya)، «تفقدهم» (tafaqqadhum)، «تكافل وأثر» (takaful-athar) — هجرة `projects.0002` قابلة للعكس.
3. **saqya → sponsorships**: نقل النماذج عبر `SeparateDatabaseAndState` (بيانات غير ملموسة إطلاقاً) + `AddField project` + هجرة ربط كل الكفالات بمشروع «كفالات السقيا». سير العمل الكامل (مورّد/مندوب/GPS/`select_for_update`) محفوظ، ومنطق الدفع استُخرج إلى `sponsorships/services.py` دون تغيير واجهة الـ API.
4. **impact_map → maps**: نسخ Region/Product/Outlet/Contribution إلى Map «خارطة تفقدهم» (mixed) بثلاث طبقات و10 حقول `MapItemField` (منها حقلان `is_public=False`)؛ Product أصبح حقل select. جداول المصدر لم تُمس (D-03/D-04).
5. **قابلية العكس + `check_migration_integrity`**: أمر إداري يلتقط لقطة أعداد لكل الجداول ويتحقق (`--verify --expect migrated|reverted`) ويخرج برمز غير صفري عند أي اختلال.

**انحرافات عن نص التكليف** (موثّقة كقرارات):
- النقل بين التطبيقات state-only بدل نسخ الصفوف (D-02) — نفس الهدف بصفر مخاطرة بيانات.
- `cover_image` حقل URL بدل ImageField (لا Pillow — D-13).
- `DistributionRecord` لم يكن ضمن قائمة الهجرة الإلزامية — بقي في impact_map (D-14، بند مؤجل).

---

## 2) قائمة الإيداعات
| Commit | المبرر |
|---|---|
| `92c5feb` | استعادة `design-system/` من المصدر `Design_system_f` (بناء الواجهة كان معطلاً على main) + `DECISIONS.md` |
| `6d3ac71` | الباك إند كاملاً: تطبيقات projects/maps، نقل sponsorships/volunteering، الهجرات القابلة للعكس، أمر السلامة، `deploy/backup.sh` |
| `6127967` | 42 اختباراً جديداً: نطاق المشاريع، صلاحيات الأعضاء، الفلترة المختلطة، التحقق الديناميكي، أمر السلامة، التوافق الخلفي |
| `58ba954` | الواجهة: الرئيسية الموحّدة، صفحات المشاريع، عارض الخرائط الديناميكي، المجمّع `/map`، `/Admin` حسب الدور، redirects، حذف الكود الميت |

---

## 3) قرارات DECISIONS.md
D-01 استعادة design-system من `Design_system_f/uploads` · D-02 نقل النماذج state-only · D-03 نسخ impact_map مع إبقاء المصدر · D-04 بنية خريطة تفقدهم (mixed، Product كحقل select) · D-05 التوافق الخلفي للمسارات (`/api/saqya/` و`/api/` القديمة تعمل كما هي + mount جديد `/api/sponsorships/`) · D-06 super-admin = الدور العالمي admin · D-07 الفلتر المركزي الوحيد · D-08 التحقق الديناميكي O(F+K) · D-09 نطاق حذف الكود الميت · D-10 الدمج بنقرة المالك · D-11 توحيد IsAdmin · D-12 بيئة check --deploy · D-13 cover_image كـ URL · D-14 استبدال واجهة /map القديمة · D-15 دخول مديري المشاريع عبر /signin. (النص الكامل في `DECISIONS.md`)

---

## 4) مخرجات فحص سلامة الهجرة (قبل/بعد، أمامي وعكسي)

قاعدة تطوير حقيقية: 12 منطقة، 4 منتجات، 8 منافذ، 6 مساهمات، 3 كفالات/طلبات/دفعات، 13 مشروع تطوع، 2289 متطوعاً.

**أمامي → تحقق (نجاح):** كل الجداول الـ28 `before == now`، و:
```
region items == impact_map.Region: got=12 want=12
outlet items == impact_map.Outlet: got=8 want=8
map contributions == impact_map.Contribution: got=6 want=6
product options == impact_map.Product: got=4 want=4
sponsorships unlinked to project: got=0 want=0
```
**عكسي (هجرات البيانات ثم عكس كامل للحالة إلى zero) → تحقق (نجاح):** كل الجداول الـ28 `before == now`، الخريطة المنسوخة أزيلت، لا كفالات مرتبطة.
**أمامي مجدداً → تحقق نهائي (نجاح):** نفس نتائج الممر الأول حرفياً — `سلامة البيانات مؤكدة — لا اختلالات` في الممرات الثلاثة.

---

## 5) خريطة المتطلب ← الملف/الاختبار
| المتطلب | التنفيذ | الاختبار |
|---|---|---|
| Project/Member/Tool | `backend/projects/models.py` | `projects/tests.py` (13) |
| نطاق super-admin/project-admin | `projects/services.py::scoped_projects_queryset` | `ProjectScopingTests` |
| صلاحيات ProjectMember | `projects/views.py` + `permissions.py` | `ProjectMemberPermissionTests` |
| Map/Layer/Item/Field/Contribution | `backend/maps/models.py` | `maps/tests.py` (17) |
| الفلتر المركزي للظهور المختلط | `maps/services.py::build_public_map_detail` | `MixedVisibilityFilteringTests` |
| التحقق الديناميكي للحقول | `maps/services.py::validate_item_data` | `DynamicFieldValidationTests` |
| إخفاء PDPL <5 | `maps/services.py::mask_small_count` | `test_summary_masks_small_counts` |
| provisioning للمشرف العام فقط | `maps/views.py::MapViewSet.create/destroy` | `test_map_creation_super_admin_only` |
| نقل saqya→sponsorships | `sponsorships/` + shims `saqya/` | كامل الحزمة القديمة (7 + 13 أمنية) خضراء |
| نقل takaful_app→volunteering | `volunteering/` + shims | الحزمة القديمة خضراء |
| هجرات قابلة للعكس + أمر السلامة | `*/migrations/000*` + `core/management/commands/check_migration_integrity.py` | `MigrationIntegrityCommandTests` (4) + الإثبات E2E أعلاه |
| نسخ احتياطي مُسكرَب | `deploy/backup.sh` | نُفّذ فعلياً قبل الهجرة |
| التوافق الخلفي للمسارات + JWT بلا تغيير | root `urls.py` + shims | `LegacyUrlCompatibilityTests` (5) |
| الرئيسية الموحّدة | `frontend/src/components/pages/Home.tsx` | build/tsc |
| `/projects/{slug}` | `projects/ProjectLanding.tsx` | build/tsc |
| `/projects/{slug}/map` بعارض ديناميكي | `ProjectMapPage.tsx` + `GenericMapView.tsx` + `DynamicFilterBar.tsx` | `filters.test.tsx` (6) |
| `/map` المجمّع الموحّد بفلترة المشروع | `MapsAggregator.tsx` | build/tsc |
| `/Admin` حسب الدور + نموذج إدخال ديناميكي | `PlatformProjects.tsx`, `MapsAdmin.tsx`, `ProtectedRoute` (staff), `AdminShell` | build/tsc |
| redirects قديمة (`/saqya`, `/Admin/map`) | `App.tsx` | `LegacyRedirects.test.tsx` (2) |
| حذف الكود الميت | `frontend/src/legacy/`, `Sidebar.jsx`, root `package.json`, صفحات map القديمة | `DEPRECATIONS.md` محدّث |

---

## 6) نتائج البوابات
| البوابة | النتيجة |
|---|---|
| حزمة الباك إند | **Ran 95 tests — OK** (53 قائمة + 42 جديدة، skipped=1 قائم سابقاً) |
| `check --deploy` (DEBUG=False + SECRET_KEY قوي) | **0 issues** |
| `tsc --noEmit` | **نظيف** |
| `vitest` | **12/12 passed** (4 ملفات) |
| `npm run build` | نجاح؛ أكبر حزمة `vendor-react` **231KB < 250KB** (leaflet 154KB، projects 16KB) |
| قابلية عكس الهجرة E2E | أمامي→تحقق→عكس(+عكس كامل للحالة)→تحقق→أمامي→تحقق — **الثلاثة ناجحة** |
| فحص دخاني وظيفي | نقاط `platform/maps` العامة 200، الطبقة الخاصة والحقول الداخلية لا تتسرب، `<5` يعمل، مساهمة عامة 201 |

---

## 7) بنود مؤجلة وحدود معروفة
- **`DistributionRecord`** (أرقام الأسر المخدومة التاريخية) لم يكن ضمن قائمة الهجرة الإلزامية؛ يبقى في `impact_map` ويُهاجر في PR لاحق (DEPRECATIONS.md).
- **قشرتا `saqya` و`takaful_app`** (هجرات + shims) تُحذفان بعد squash للهجرات في إصدار لاحق — إبقاؤهما شرط لسلامة قواعد البيانات القائمة.
- **`volunteering.Volunteer`** القديم ما زال ينتظر هجرة بياناته إلى User+Profile قبل حذفه (شرط قائم سابقاً).
- **دخول مديري المشاريع**: عبر `/signin` ثم `/Admin/projects` (صفحة `/admin/signin` تقبل الدور العام admin فقط — سلوك قائم لم يُكسر، D-15).
- **مسارات `/api/map/*` القديمة** تبقى حية للتوافق؛ الواجهة الجديدة تستخدم `/api/maps/*` حصراً.
- لا فحوصات بصرية/متصفح — حسب التكليف صراحة.

الجاهزية للسحابة: `check --deploy` نظيف، `deploy/backup.sh` يدعم `DATABASE_URL` (PostgreSQL)، الهجرات تعمل على قاعدة قائمة أو جديدة، ولا تغيير في JWT أو حسابات المستخدمين.
