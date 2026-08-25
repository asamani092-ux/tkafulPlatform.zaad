# DECISIONS.md — refactor/project-first-architecture

قرارات معمارية اتُّخذت أثناء التنفيذ المستمر (بدون انتظار موافقات وسيطة) مع المبررات.

## D-01 — استعادة `design-system/` في جذر المستودع
- **المشكلة**: بناء الواجهة (`npm run build`) معطّل على `main` لأن `frontend/src/index.css` و`tailwind.config.js`
  يستوردان من `../../design-system/` المحذوف (commits `a4f74ed`, `9876284`).
- **القرار**: استعادة الحزمة من المصدر الأساسي `Design_system_f/uploads/design-system/`
  (tokens.css / components.css / tokens.json / tailwind.preset.ts) بدون سكربتات `*.ps1` الميتة
  (مطابقة لبند DEPRECATIONS.md).
- **البديل المرفوض**: تعديل مسارات الاستيراد إلى `Design_system_f/uploads/...` — مسار عربي/تحميلات غير مستقر
  ويخالف AGENTS.md الذي يعتبر `design-system/` جزءاً ثالثاً من الـ monorepo.

## D-02 — نقل النماذج بين التطبيقات عبر `SeparateDatabaseAndState` بدل النسخ صفاً بصف
- **المتطلب**: "Data-migrate saqya.* into sponsorships app" و"volunteering extracted from takaful_app".
- **القرار**: نقل النماذج بتغيير حالة الهجرات فقط (state-only) مع تثبيت `db_table` على أسماء الجداول
  الأصلية (`saqya_*`, `takaful_app_*`). البيانات لا تُلمس إطلاقاً؛ العكس (reverse) حتمي الأمان.
- **المبرر**: نسخ الصفوف بين جداول متطابقة البنية يضاعف مخاطر فقدان البيانات وكسر تسلسلات المفاتيح،
  بينما النقل الحالي يحقق نفس الهدف المعماري (الملكية المنطقية للنماذج في التطبيق الجديد) بصفر مخاطرة.
- **التعقيد**: O(1) زمنياً ومكانياً لكل هجرة نقل (عمليات حالة فقط، لا SQL على الصفوف).

## D-03 — هجرة بيانات `impact_map` → `maps` بالنسخ (copy-forward) مع إبقاء جداول المصدر
- **القرار**: الهجرة الأمامية تنسخ Region/Product/Outlet/Contribution إلى بنية
  Map/MapLayer/MapItemField/MapItem/MapContribution تحت مشروع "تفقدهم"؛ الهجرة العكسية تحذف الصفوف
  المنسوخة فقط. جداول `impact_map` تبقى سليمة كمصدر حقيقة حتى إثبات الاستقرار (تُحذف في PR لاحق
  حسب قاعدة DEPRECATIONS.md "لا حذف قبل الاستقرار").
- **المبرر**: قابلية العكس المطلوبة في البوابات تصبح حتمية (حذف المنسوخ يعيد الحالة الأصلية تماماً).
- **التعقيد**: O(R+P+O+C) زمنياً حيث R,P,O,C أعداد الصفوف؛ O(P) مكانياً لخريطة المنتجات المؤقتة.

## D-04 — بنية خريطة "تفقدهم" في النظام الجديد
- Map واحدة (visibility=mixed) بثلاث طبقات: "المناطق" (public)، "المنافذ" (public)، "المساهمات" (private).
- Region/Outlet تتحول إلى MapItem في طبقتيها؛ خصائصهما (priority/boundary/type/working_hours/…)
  تُخزَّن في `MapItem.data` وفق `MapItemField` معرّفة (منها حقول `is_public=False` مثل ساعات العمل الداخلية).
- Product تتحول إلى `MapItemField(type=select)` بخيارات (options JSON) على مستوى الخريطة —
  لأن المنتج ليس نقطة جغرافية بل بُعد تصنيفي للمساهمات.
- Contribution → MapContribution محافظةً على الحقول (name/phone/mode/quantity/note/status).

## D-05 — التوافق الخلفي لمسارات الـ API
- تُركَّب `sponsorships.urls` على `/api/saqya/` (المسار القديم كما تستهلكه الواجهة) وعلى `/api/sponsorships/` الجديد.
- تُركَّب `volunteering.urls` على `/api/` بنفس المسارات القديمة (`/api/projects/`, `/api/stats/`, …).
- مسارات `impact_map` القديمة `/api/map/*` تبقى تعمل (redirect 301 إلى `/api/maps/legacy/*` غير ممكن
  لطلبات POST بأمان، لذا تبقى الـ views القديمة حية حتى إزالة الاعتماد عليها بالكامل ثم تُحذف في PR لاحق).
- **لا تغيير** في JWT أو حسابات المستخدمين (المتطلب غير القابل للتفاوض).

## D-06 — مصطلح "super-admin"
- لا يوجد دور `super_admin` في `Profile.ROLE_CHOICES`، وإضافته تكسر حسابات موجودة.
- **القرار**: super-admin = `profile.role == "admin"` (الدور العالمي الحالي). project-admin يُمنح عبر
  `ProjectMember(role="project_admin")`. الأدوار العالمية لم تتغير (متطلب صريح).

## D-07 — الفلتر المركزي للحمولة العامة
- دالة واحدة `maps/services.py::filter_public_payload(map, item)` تُرجع فقط عناصر الطبقات
  `visibility=public` والحقول `is_public=True`. كل الـ serializers العامة تمر عبرها؛ لا فلترة لكل endpoint.
- إخفاء PDPL (<5) محفوظ في `maps.services.mask_small_count` ويُطبَّق على أي عدّاد أسر/مستفيدين مجمّع.
- **التعقيد**: O(F) لكل عنصر حيث F عدد الحقول المعرّفة؛ الفهرسة على (map, is_public) تجعل الجلب O(log N).

## D-08 — التحقق الديناميكي من الحقول
- كل كتابة على `MapItem.data` تمر عبر `maps/services.py::validate_item_data` التي تتحقق من النوع
  (text/number/select/boolean/date)، والإلزامية، وقيم select ضمن options. الرفض يعيد 400 برسائل عربية.
- **التعقيد**: O(F + K) حيث K حجم القاموس المُرسل؛ المفاتيح غير المعرّفة تُرفض (Scope Precision).

## D-09 — نطاق حذف الكود الميت (DEPRECATIONS.md)
- حُذف في هذا الـ PR: `frontend/src/legacy/` (99 ملفاً غير مُوجَّه وغير مشمول بـ tsc)، `Sidebar.jsx` الجذري،
  `package.json` الجذري، سكربتات `*.ps1` (لم تُستعد أصلاً).
- **لم يُحذف**: نموذج `takaful_app.Volunteer` (انتقل إلى `volunteering` كما هو) لأن DEPRECATIONS.md يشترط
  هجرة بياناته إلى User+Profile قبل الحذف، وهذا خارج نطاق سلامة البيانات لهذا الـ PR.

## D-10 — "مدموجة في المستودع"
- التعليمات التفصيلية تنص: "Open ONE PR … this is the only stop point"، وسياسة الوكيل تمنع دمج الـ PR
  دون طلب صريح منفصل. القرار: الـ PR مفتوح وجاهز للدمج؛ الدمج الفعلي بنقرة المالك.

## D-11 — إعادة استخدام IsAdmin مركزياً
- `IsAdmin` كانت مكررة في `takaful_app.views` و`notifications.views`. نُقلت النسخة القانونية إلى
  `core/permissions.py` مع إبقاء aliases في المواضع القديمة للتوافق (ثبات الواجهات).

## D-13 — `Project.cover_image` كرابط URL وليس ImageField
- لا يوجد Pillow في requirements، وإضافته تبعية جديدة غير ضرورية لهذا النطاق.
- **القرار**: `URLField` لرابط صورة الغلاف. يمكن الترقية لاحقاً إلى رفع ملفات عبر نمط
  private-media القائم في sponsorships إذا طُلب.

## D-14 — واجهة /map القديمة (خارطة تفقدهم) تُستبدل بالمجمّع الموحّد
- صفحة `/map` الجديدة تجمع كل الطبقات العامة لخرائط المشاريع النشطة مع فلترة بالمشروع،
  وخريطة «تفقدهم» المهاجرة تُعرض عبر `/projects/tafaqqadhum/map` بنفس المسار العام الجديد.
- أرقام «الأسر المخدومة» المشتقة من `DistributionRecord` لم تكن ضمن نطاق هجرة البيانات
  الإلزامي (Region/Product/Outlet/Contribution فقط) — تبقى متاحة عبر `/api/map/*` القديم
  وتُهاجر في PR لاحق (مقيّدة في DEPRECATIONS.md).
- `/Admin/map` القديم → redirect إلى `/Admin/maps` (إدارة نظام الخرائط الجديد).

## D-15 — دخول مديري المشاريع (project-admin)
- صفحة `/admin/signin` القديمة ترفض غير `admin` (سلوك قائم لم يُكسر). مدير المشروع يسجّل
  عبر `/signin` العادية ثم يفتح `/Admin/projects`؛ الحارس الجديد `staff` يتحقق من العضوية
  عبر `/api/platform/my-memberships/`.

## D-16 — مزامنة impact_map→maps كدالة واحدة مشتركة + وسم المصدر
- **المشكلة**: هجرة `maps.0002` تنسخ ما هو موجود لحظة تشغيلها؛ في سير المطوّر الافتراضي
  (migrate ثم seed) تبقى الخريطة فارغة ويفشل فحص السلامة.
- **القرار**: منطق النسخ الوحيد في `maps/sync.py::sync_impact_map_to_maps` تستدعيه
  الهجرة (بنماذج تاريخية) والأمر الإداري `sync_impact_map_to_maps` (بنماذج حية)،
  و`seed_impact_map` يستدعي الأمر تلقائياً في نهايته.
- **idempotency**: العناصر/الحقول upsert بمفاتيح ثابتة؛ المساهمات تُنسخ مرة واحدة بوسم
  `MapContribution.external_id = "impact_map:<id>"` (إضافة تراكمية — المساهمات العامة
  الجديدة بدون وسم لا تُمسّ)، وفحص السلامة يقارن النسخ الموسومة فقط بالمصدر.
- **ملاحظة**: تفويض الهجرة إلى دالة حية مقبول هنا لأن الدالة idempotent والأمر الإداري
  يصالح أي انحراف بعد الهجرة بطبيعته؛ عُدّلت maps/0001 و0002 في مكانهما لأن الفرع غير مدموج.
- **التعقيد**: O(R+P+O+C) زمنياً، O(P) مكانياً، وفحص تكرار كل مساهمة O(log N) بفهرس
  (map, external_id).

## D-17 — الدخول الموحّد (يلغي D-15)
- صفحة دخول واحدة `/signin` والتوجيه بعد المصادقة حسب الصلاحية:
  `admin` → `/Admin`، عضو مشروع (عبر `/api/platform/my-memberships/`) → `/Admin/projects`،
  غير ذلك → `/user/main`. حُذفت صفحة `/admin/signin` وبقي مسارها **redirect** للتوافق.
- لا تغيير في الباك إند (JWT واحد أصلاً) — الازدواجية كانت واجهة فقط.

## D-18 — إعادة هيكلة الخارطة العامة /map
- المجمّع الموحّد اكتمل: KPI مجمّعة (جمع mask-aware لا يكشف `<5` أبداً — إن وُجدت قيمة
  مقنّعة يُعرض `N+`)، فلاتر ديناميكية موحّدة عبر `mergeFields` (اتحاد خيارات select)،
  وسيلة إيضاح مولّدة من `color_scheme`، مساهمة مباشرة من العنصر المحدد، وحذف شبكة
  البطاقات المكررة.
- أُثري `color_scheme` بألوان أنواع المنافذ في `maps/sync.py` (`DEFAULT_COLOR_SCHEME`)
  بدمج تراكمي للمفاتيح الناقصة على الخرائط القائمة دون استبدال تخصيصات يدوية.
- التعقيد: دمج O(M·N)، فلاتر O(N·K)، دمج الحقول O(M·F)، جمع mask-aware O(V).

## D-19 — دمج اللوحة التنفيذية في اللوحة الموحّدة
- `/executive` كانت **عامة بلا حارس** رغم كونها بيانات تشغيلية — عيب صلاحيات أُغلق.
- الموقع الجديد: `/Admin/executive` (عرض) و`/Admin/executive/manage` (تغذية) بحارس
  `orgStaff` جديد (admin/manager/employee — يطابق `IsStaffOrReadOnly` في الباك إند حتى
  لا يُحرم المدراء/الموظفون)، والمسارات القديمة **redirects**، وأُزيل الرابط من الـ Navbar العام.
- الباك إند `/api/dashboard/*` بلا تغيير (ثبات الواجهات).

## D-20 — ضبط الشعار
- رفع المالك ملف الشعار الرسمي إلى `frontend/public/logo.png` وحذف إعادة الرسم التقريبية
  `logo-alzad.svg` — اعتُمد الأصل الرسمي وكل المراجع (Navbar، اللوحات، الدخول، favicon)
  تشير الآن إلى `/logo.png`.

## D-12 — `check --deploy` تحت بيئة إنتاج
- يُشغَّل بـ `DEBUG=False` و`SECRET_KEY` عشوائي قوي و`SECURE_*` المفعّلة افتراضاً في settings عند
  `DEBUG=False`. النتيجة مسجلة في التقرير النهائي.

## D-23 — maps مصدر الحقيقة الوحيد؛ إزالة impact_map (Phase A1)
- **القرار**: إضافة `maps.MapProduct` (كتالوج منتجات لكل خريطة) و`maps.MapDistributionRecord`
  (سجلات توزيع مرتبطة بـ MapItem منطقة + MapProduct). المناطق/المنافذ تبقى `MapItem`؛ المساهمات
  `MapContribution`. هجرة `maps.0003` تنقل Product/DistributionRecord من impact_map؛ هجرة
  `impact_map.0002` تحذف النماذج الخمسة (stub app يبقى للتاريخ).
- **واجهة API**: `/api/map/*` تُخدم بمحول رفيع (`maps/legacy_urls|views|serializers`) يقرأ/يكتب
  نماذج maps مع الحفاظ على أشكال JSON السابقة (ثبات الواجهات — D-05).
- **البذر**: `seed_impact_map` ينتقل إلى `maps/management/commands/` ويكتب مباشرة إلى maps؛
  `sync_impact_map_to_maps` يُزال (sync.py يرفع RuntimeError؛ منطق تاريخي في migrations فقط).
- **فحص السلامة**: `check_migration_integrity` يعدّ جداول maps بدل impact_map كثوابت بعد A1.
- **المبرر**: إنهاء ازدواجية المصدر/النسخة؛ تبسيط الصيانة مع توافق خلفي كامل لـ UAT والواجهة.

## D-24 — إزالة أصداف saqya و takaful_app (Phase A2)
- **القرار**: حذف وحدات Python غير الضرورية (views/urls/serializers/admin/tests) من `saqya` و
  `takaful_app`؛ الإبقاء على `apps.py` + مجلد `migrations/` فقط لسلسلة الهجرات. `saqya/models.py`
  يحتفظ بإعادة تصدير `invoice_upload_path` و`documentation_upload_path` لأن `saqya/0001_initial`
  يستوردها.
- **التوجيه**: `takaful_backend/urls.py` يضمّن `sponsorships.urls` مباشرة على `/api/saqya/` و
  `volunteering.urls` على `/api/` — بدون وسيط takaful_app.urls.
- **الاستيرادات**: كل `from saqya.models` / `from takaful_app.models` في الكود الحي تُستبدل بـ
  `sponsorships` / `volunteering` (أو `services` / `reporting` بعد A4).
- **المبرر**: إنهاء الازدواجية؛ التطبيقان الأصليان كانا shims فارغة بعد D-02.
- **التوافق**: مسارات `/api/saqya/*` و`/api/projects/*` و`/api/stats/` تبقى كما هي (D-05).

## D-25 — دمج volunteering.Project في projects.Project (Phase A3)
- **الواقع**: `volunteering.Project` يحتوي **13 صفاً** (ليست صفراً) — مشاريع تطوّع فعلية من استيراد Excel.
- **القرار**: `VolunteeringProfile` (OneToOne → `projects.Project`) يحمل الحقول الخاصة بالتطوّع
  (category, beneficiaries, donation_amount, tags, progress, is_hidden, volunteer_status, …) بينما
  `projects.Project` يحمل الهوية الموحّدة (name/slug/description/dates/status).
- **هجرة البيانات**: لكل صف قديم — مطابقة بالاسم (تفقدهم→tafaqqadhum، منصة تكافل وأثر→takaful-athar،
  سقيا الزاد→saqya) أو إنشاء slug جديد؛ إنشاء VolunteeringProfile؛ تفعيل أداة volunteering؛
  إعادة توجيه FKs (Task, ProjectAssignment, VolunteerApplication, StaffTask) إلى `projects.Project`.
- **حذف**: جدول `takaful_app_project` (نموذج volunteering.Project) بعد نقل البيانات — مع عكس قابل للتنفيذ.
- **واجهة API**: `/api/projects/` تُرجع نفس شكل JSON (title/desc/status) عبر ProjectSerializer المُكيَّف
  على VolunteeringProfile؛ المعرّف `id` = `projects.Project.id`.

## D-26 — تقسيم volunteering وظيفياً: services + reporting (Phase A4)
- **القرار**: تطبيقان جديدان — `services` (Service, ServiceRequest, ServiceVolunteerApplication,
  WaterSupplyRequest, Suggestion) و`reporting` (AdminReport, VolunteerStatistics, QuarterlyTarget,
  DepartmentHours, TopVolunteer). يبقى في `volunteering`: Volunteer, VolunteerApplication,
  ProjectAssignment, Task, Subtask, VolunteeringProfile.
- **الهجرة**: `SeparateDatabaseAndState` فقط — `db_table` يبقى `takaful_app_*`؛ صفر نقل بيانات.
- **المسارات**: `volunteering.urls` يضمّن `services.urls` و`reporting.urls` — كل مسارات `/api/*`
  القديمة تعمل دون تغيير.
- **المبرر**: فصل المسؤوليات (تطوّع / خدمات / تقارير) مع الحفاظ على التوافق الخلفي الكامل.

## D-27 — روابط تبرع لكل مشروع (Phase A5)
- **القرار**: `projects.Project` يحصل على `donation_url` (HTTPS فقط) و`donation_label` (افتراضي «تبرع الآن»).
- **التحقق**: `projects/validators.validate_https_donation_url` على النموذج والـ serializer.
- **الواجهة**: تُعرض في serializers العامة والإدارية؛ تُحرَّر في `PlatformProjects.tsx`.
- **CTAs**: خريطة التعهد تستخدم `project.donation_url` من بيانات الخريطة؛ صفحة هبوط المشروع تعرض زر التبرع
  عند توفر الرابط؛ كفالات السقيا (`checkout_url`) تفضّل `sponsorship.project.donation_url` على
  `EXTERNAL_STORE_URL` كاحتياطي منصّة فقط.
- **المبرر**: تخصيص رابط التبرع لكل مشروع دون كسر التوافق مع المتجر الخارجي الافتراضي.

## D-28 — قاعدة فرع Phase B على Phase A غير المدموج
- `main` عند بدء Phase B لا يزال عند `39c89fe` (قبل Phase A). PR #9 (Phase A) مفتوح وغير مدمج.
- **القرار**: قطع `refactor/phase-b-ui` من `refactor/phase-a-cleanup` @ `f57404a` لاستخدام
  `donation_url` ومسارات المنصّة. عند دمج Phase A في `main` يُعاد استهداف قاعدة الـ PR أو يُدمَج بالتسلسل.

## D-29 — إعادة استخدام `/Admin/requests` لنطاق الطلبات
- سابقاً: `/Admin/requests` = طلبات انضمام المتطوعين، و`/Admin/service-requests` = طلبات الخدمات.
- **القرار**: `/Admin/requests` = نطاق **الطلبات** (خدمات + سقيا + اقتراحات). طلبات الانضمام →
  `/Admin/volunteers/join-requests`. `/Admin/service-requests` و`/Admin/ideas` redirects.
- **المبرر**: تسمية عربية موحّدة بلا ازدواج ideas/suggest أو requests/service-requests.

## D-30 — لا واجهة تنفيذية عامة
- بعد D-19 أصبحت `/executive` تحويلاً للإدارة. Phase B ينقلها إلى `/Admin/staff`.
- **القرار**: لا مسار عام للقراءة فقط للوحة الكادر — بيانات تشغيلية تبقى تحت حارس `orgStaff`.

## D-31 — قائمة طلبات سقيا للإدارة بلا تغيير نموذج
- **القرار**: `WaterSupplyRequestViewSet` (ReadOnly) على `/api/water-supply-requests/` — بدون حقول/جداول جديدة.
- الصفحة العامة `/services/water-supply?project=saqya` تربط النموذج بمشروع السقيا في الواجهة؛
  الطلبات تظهر في نطاق الطلبات.

## D-32 — قائمة المشاريع العامة من منصّة المشاريع
- `/projects` كانت تعرض `/api/public-projects/` (تطوّع قديم) بلا روابط هبوط.
- **القرار**: نفس مصدر Home — `/api/platform/public/projects/` مع رابط صفحة المشروع وCTA تبرع
  يُخفى إن لم يُضبط `donation_url`.

## D-33 — اعتماد التصميم المركزي وإلغاء الهيرو المارون القديم
- **المصدر**: `@zaad/design-system` من `asamani092-ux/designSystemFinal` (وسم `v1.2.11`).
- **القرار**: استبدال الاستيراد المحلي `design-system/` بـ الحزمة المركزية؛ جذر
  `zad-root` + `data-theme="light"`؛ رؤوس الصفحات (Home/HeroBand/ProjectLanding/Saqya/Footer)
  سطح فاتح + `text-primary`/`text-brand`؛ المارون للأزرار/الشارات/التمييز فقط.
- **المبرر**: التصميم القديم (هيرو `--tmkeen-primary` ممتلئ) لا يطابق عقد الهوية المركزي.

## D-34 — ملكية طبقة الـ API: services + reporting (Phase 1)
- **المشكلة**: بعد D-26 صارت النماذج في `services`/`reporting` بينما الـ views/serializers بقيت في
  `volunteering` مع تضمين متداخل عبر `volunteering.urls`.
- **القرار**: نقل serializers + views إلى التطبيق المالك؛ `takaful_backend/urls.py` يضمّن
  `services.urls` و`reporting.urls` مباشرة تحت `/api/`؛ إزالة التضمين المتداخل من
  `volunteering.urls`. مسارات الـ URL كما هي (لا كسر للواجهة).
- **إعادة تسمية**: `ProjectViewSet` → `VolunteeringProfileViewSet` مع الإبقاء على مسار
  `projects` (`basename="volunteering-profile"`) حتى يبقى `/api/projects/` ثابتاً.
- **جدول التوافق (legacy path → ملكية جديدة)**:

  | Path | كان | أصبح |
  |------|-----|------|
  | `/api/public-services/`, `/api/beneficiary-services/`, `/api/public-suggestions/`, `/api/public-service-request/`, `/api/public-water-supply-request/`, `/api/services/`, `/api/service-requests/`, `/api/suggestions/`, `/api/water-supply-requests/`, `/api/services/<id>/apply-volunteer/`, `/api/admin/service-volunteer-applications/*` | nested via `volunteering.urls` → `services.urls` | root `include("services.urls")` |
  | `/api/reports/*`, `/api/public-volunteer-statistics/`, `/api/admin/volunteer-statistics/`, `/api/admin/upload-statistics/` | nested via `volunteering.urls` → `reporting.urls` | root `include("reporting.urls")` |
  | `/api/projects/` | `volunteering.views.ProjectViewSet` | `volunteering.views.VolunteeringProfileViewSet` (نفس المسار) |

- **لا تغيير**: مواقع النماذج، هجرات بيانات، مسارات الواجهة الأمامية.

## D-35 — ربط WaterSupplyRequest بالمشروع (Phase 2A)
- **المشكلة**: نموذج سقيا الماء العام كان بلا FK للمشروع؛ الواجهة تمرّر `?project=saqya` دون حفظه.
- **القرار**: حقل اختياري `project = FK(projects.Project, SET_NULL, related_name=water_supply_requests)`؛
  الهجرة `services.0002_watersupplyrequest_project` قابلة للعكس؛ الـ serializer يعرض
  `project` + `project_slug`/`project_name`؛ `public_water_supply_request` يقبل slug أو id
  من الجسم أو الاستعلام؛ الواجهة ترسل `project` من `?project=`؛ قائمة الإدارة تعرض اسم المشروع
  أو «طلب عام» عند null. نطاق الطلبات في `domains.ts` يحتفظ برابط سقيا الماء.

## D-36 — خط أساس الأمان (Phase 2B)
- **الأثر**: `PERMISSION_TABLE.md` يوثّق النقاط × الأدوار؛ اختبارات دائمة في
  `core/tests_security.py` + `core/tests_security_phase2.py` (IDOR، أدوار المشاريع، ملفات خاصة،
  رفع/GPS، throttles، JWT blacklist، PDPL، هجرة سقيا).
- **AllowAny المبرَّر**: نماذج عامة (سقيا/اقتراح/طلب خدمة) مع `PublicWriteRateThrottle`؛
  كتالوج مشاريع/خدمات وإحصاءات عامة؛ خرائط عامة مع إخفاء PDPL (&lt;5)؛ تسجيل/دخول مع
  `AuthRateThrottle`. قائمة إدارة سقيا تبقى `IsAdmin` (بيانات شخصية).
- **استثناء موروث**: `GET /api/dashboard/executive/` ما زال AllowAny (واجهة `/executive` محوّلة
  للإدارة — D-30). تشديد هذا الـ API مؤجَّل حتى لا يُكسر تكامل لوحة قديمة؛ موثّق في
  `PERMISSION_TABLE.md`.
- **JWT**: Access 1 يوم / Refresh 7 أيام؛ تدوير + blacklist بعد التدوير؛ logout يُدرج
  الـ refresh في القائمة السوداء — بلا تغيير في هذا الطور.
- **وسائط خاصة**: تنزيل الفواتير/التوثيق عبر `/api/saqya/.../file/` مصادق مع فحص ملكية
  (ليس عبر `MEDIA_URL` العام).
- **تدقيقات التبعيات (Phase 2)**: `pip-audit` → ترقية Django `5.2.15`→`5.2.17` (إغلاق
  PYSEC-2026-2090/2091/2092). `npm audit --omit=dev --audit-level=high` → `npm audit fix`
  أغلق ثغرات high في `react-router`/`react-router-dom`؛ لا متبقٍ عالي/حرج في الإنتاج.

## D-37 — نموذج UAT داخلي مُقيَّد بالبيئة (Phase 3)
- **المشكلة**: صفحة `/uat` للتقييم الداخلي يجب ألا تظهر في إنتاج العميل.
- **القرار**:
  - الواجهة: تسجيل المسار فقط عند `VITE_ENABLE_UAT === "true"` مع `lazy` مشروط لإزالة
    الـ chunk من بناء الإنتاج (dead-code elimination)؛ بدون العلم يسقط `/uat` على 404.
  - حالة النموذج في ذاكرة الجلسة فقط (`useState`) — بلا `localStorage`؛ النسخ/التنزيل
    Markdown يبقى.
  - بوابة صلبة: `npm run assert:no-uat` تفشل إن وُجدت سلاسل UAT المميزة في `dist/`.
  - الخلفية: `UAT_ENABLED` (افتراضي False)؛ `GET /api/uat/` يعيد 404 عند التعطيل و
    `{"enabled": true}` عند التفعيل.
- **لا تضبط** `VITE_ENABLE_UAT` أو `UAT_ENABLED` في الإنتاج (انظر DEPLOYMENT.md).

## D-38 — إدارة المستخدمين أفقية في `accounts` بدون نموذج جديد
- **المشكلة**: لا توجد واجهات مشرف لـ CRUD المستخدمين؛ الدور على `Profile.role` والحالة على `User.is_active`.
- **القرار**: `AdminUserViewSet` تحت `/api/accounts/users/` (IsAdmin) دون جدول جديد — يستخدم User+Profile القائمين. بلا هجرة.
- **حراسة آخر مشرف**: COUNT للمشرفين النشطين (`is_active` + `profile.role=admin`) O(1). منع حذف الحساب الذاتي، حذف/تنزيل/تعطيل آخر مشرف نشط (رسائل عربية 400).
- **الواجهة**: نطاق مستقل «المستخدمون» `/Admin/users` — ليس تحت المتطوعين (خلط أنواع المستخدمين مع نطاق التطوّع).
- **التعقيد**: بحث القائمة O(N) في قاعدة البيانات؛ صفحة الحجم P تسلسل O(P)؛ الإجراءات O(1).

## D-39 — إعدادات المنصّة صف واحد داخل `core`
- **القرار**: طيّ الإعدادات في تطبيق `core` الحالي (لا تطبيق Django جديد) لأن الطبقة أفقية ولا تحتاج دورة حياة تطبيق مستقلة.
- **النموذج**: `PlatformSetting` singleton (`pk=1` في `save`) + `StaticPage(slug, title, body, is_published)`.
- **عام**: `GET /api/public-settings/` (AllowAny + cache 60s) يعيد فقط الحقول الآمنة + الصفحات المنشورة — بلا `id`/`updated_at`/`is_published`.
- **مشرف**: `GET/PATCH /api/settings/` وCRUD `/api/static-pages/` بـ IsAdmin.
- **التحقق**: روابط الشعار/التواصل HTTPS؛ بريد ورقم هاتف.
- **الواجهة**: نطاق «الإعدادات»؛ الموقع العام يقرأ الاسم/الشعار/التواصل/الأعلام مع fallback عند الفراغ.
- **التعقيد**: load O(1)؛ الحمولة العامة O(P) لعدد الصفحات المنشورة.

