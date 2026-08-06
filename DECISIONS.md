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

## D-21 — اعتماد `@zaad/design-system` v1.2.0 وحذف النسخ المحلية
- **المشكلة**: مصدر التصميم مكرّر محلياً (`design-system/` + `Design_system_f/`) بينما المصدر
  الرسمي الموحّد هو `asamani092-ux/designSystemFinal`.
- **القرار**: ربط الحزمة عبر npm (`github:...#v1.2.0`)، استيراد `tokens.css` + `components.css` +
  `tailwind.preset`، جذر `zad-root` + `dir=rtl`، ثم حذف النسخ المحلية بعد نجاح البناء.
- **التطبيق**: تنفيذ عقود `components.md` كمكوّنات React إضافية على الشاشات القائمة فقط
  (بدون توسيع API/DB وبدون إعادة تسمية props مربوطة بالواجهة).
- **التعقيد**: الربط O(1)؛ تطبيق المكوّنات O(S×C).

## D-12 — `check --deploy` تحت بيئة إنتاج
- يُشغَّل بـ `DEBUG=False` و`SECRET_KEY` عشوائي قوي و`SECURE_*` المفعّلة افتراضاً في settings عند
  `DEBUG=False`. النتيجة مسجلة في التقرير النهائي.
