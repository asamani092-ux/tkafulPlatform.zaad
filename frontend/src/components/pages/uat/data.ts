/** بيانات نموذج تقييم القبول — ثلاث مراحل بترقيم متسلسل واضح. */
/** التعقيد: تصفية مرحلة O(أقسام)، تعداد سيناريوهات مرحلة O(س). */

export interface UatScenario {
  id: string;
  title: string;
  role?: string;
  expected: string;
}

export interface UatSection {
  key: string;
  title: string;
  /** رقم القسم داخل المرحلة (1-based) للعرض المتسلسل. */
  orderInPhase: number;
  trialPhase: 1 | 2 | 3;
  scenarios: UatScenario[];
}

export const UAT_TRIAL_PHASES = [
  {
    id: 1 as const,
    title: "المرحلة 1",
    subtitle: "الزائر ثم الدخول",
    goal: "تصفّح الموقع العام بدون حساب، ثم الدخول والتوجيه حسب الدور.",
    doNext: "بعد إكمال هذه المرحلة انتقل للمتطوّع ولوحة الإدارة.",
  },
  {
    id: 2 as const,
    title: "المرحلة 2",
    subtitle: "المتطوّع ثم الإدارة",
    goal: "بوابة المتطوّع، ثم نطاقات لوحة الإدارة، ثم التحويلات القديمة.",
    doNext: "بعد إكمال هذه المرحلة انتقل لأدوات التشغيل وسلامة البيانات.",
  },
  {
    id: 3 as const,
    title: "المرحلة 3",
    subtitle: "الأدوات ثم السلامة",
    goal: "دورة الكفالات، ثم إدارة الخرائط، ثم فحص سلامة البيانات في النهاية.",
    doNext: "بعد الإكمال سجّل الحكم النهائي ونسخ التقرير.",
  },
];

export function sectionsForPhase(phase: 1 | 2 | 3): UatSection[] {
  return UAT_SECTIONS.filter((s) => s.trialPhase === phase).sort(
    (a, b) => a.orderInPhase - b.orderInPhase,
  );
}

/**
 * هجرة أرقام السيناريوهات القديمة → الترقيم المتسلسل حسب المرحلة.
 * المرحلة 1: 1.x و 2.x كما هي.
 * المرحلة 2: كان 8→3، 3→4، 4→5.
 * المرحلة 3: كان 5→6، 6→7، 7→8.
 */
export const UAT_ID_MIGRATION: Record<string, string> = {
  "8.1": "3.1",
  "8.2": "3.2",
  "8.3": "3.3",
  "3.1": "4.1",
  "3.2": "4.2",
  "3.3": "4.3",
  "3.4": "4.4",
  "3.5": "4.5",
  "3.6": "4.6",
  "3.7": "4.7",
  "3.8": "4.8",
  "3.9": "4.9",
  "3.10": "4.10",
  "4.1": "5.1",
  "4.2": "5.2",
  "4.3": "5.3",
  "4.4": "5.4",
  "4.5": "5.5",
  "4.6": "5.6",
  "4.7": "5.7",
  "4.8": "5.8",
  "4.9": "5.9",
  "5.1": "6.1",
  "5.2": "6.2",
  "5.3": "6.3",
  "5.4": "6.4",
  "5.5": "6.5",
  "5.6": "6.6",
  "5.7": "6.7",
  "6.1": "7.1",
  "6.2": "7.2",
  "6.3": "7.3",
  "6.4": "7.4",
  "6.5": "7.5",
  "6.6": "7.6",
  "7.1": "8.1",
};

export const UAT_SECTIONS: UatSection[] = [
  {
    key: "public",
    trialPhase: 1,
    orderInPhase: 1,
    title: "الموقع العام (بدون دخول)",
    scenarios: [
      {
        id: "1.1",
        title: "فتح / على المنفذ 3400",
        expected: "الصفحة الرئيسية: مقدّمة المنصّة + مشاريع نشطة + أرقام أثر + خدمات؛ زر تبرع يظهر فقط إن وُجد donation_url",
      },
      {
        id: "1.2",
        title: "التنقّل العام (Navbar): الرئيسية · المشاريع · الخدمات · المتطوعون · خارطة الأثر · من نحن · اقترح مبادرة",
        expected: "كل صفحة عامة ≤ نقرتين من الرئيسية؛ لا رابط «كفالات السقيا» المنفصل في الشريط",
      },
      {
        id: "1.3",
        title: "فتح /projects",
        expected: "قائمة منصّة المشاريع مع رابط صفحة كل مشروع؛ CTA تبرع مخفي إن لم يُضبط الرابط",
      },
      {
        id: "1.4",
        title: "فتح /projects/saqya و /projects/tafaqqadhum و /projects/takaful-athar",
        expected: "صفحة هبوط + أدوات ProjectTool؛ إخفاء نموذج سقيا عبر VITE_ENABLE_WATER_SUPPLY_FORM=false",
      },
      {
        id: "1.5",
        title: "فتح /map",
        expected: "بعد seed_impact_map: KPI + فلترة + عناصر على الخريطة (عرض فقط)",
      },
      {
        id: "1.6",
        title: "فتح /projects/tafaqqadhum/map",
        expected: "بعد seed_impact_map: خريطة تفقدهم + فلاتر ديناميكية (عرض فقط)",
      },
      {
        id: "1.7",
        title: "تعهّد من الخريطة العامة",
        expected: "يُنشأ التعهّد بحالة pending بنجاح",
      },
      {
        id: "1.8",
        title: "فتح /saqya",
        expected: "تحويل إلى /projects/saqya (هبوط عام)؛ الكفالات على /projects/saqya/sponsorships تتطلب دخولاً",
      },
      {
        id: "1.9",
        title: "فتح /services/water-supply?project=saqya",
        expected: "من الرئيسية أو /services؛ إرسال لمرة واحدة + مسح الحقول؛ يظهر في /Admin/requests/water-supply",
      },
      {
        id: "1.10",
        title: "فتح /suggest و /request-service",
        expected: "من الرئيسية أو /services؛ إرسال لمرة واحدة + مسح الحقول؛ لا تعديل بعد الإرسال",
      },
    ],
  },
  {
    key: "auth",
    trialPhase: 1,
    orderInPhase: 2,
    title: "الدخول الموحّد والتوجيه حسب الدور",
    scenarios: [
      {
        id: "2.1",
        title: "دخول admin@takaful.com عبر /signin",
        role: "admin",
        expected: "توجيه إلى /Admin (نظرة عامة بسبع بطاقات نطاق)",
      },
      {
        id: "2.2",
        title: "دخول مدير مشروع uat_pm عبر /signin",
        role: "uat_pm",
        expected: "توجيه إلى /Admin/projects؛ الشريط يعرض مشاريع+خرائط فقط (حسب أدوات مشروعه)",
      },
      {
        id: "2.3",
        title: "متطوع / مستخدم عادي بعد الدخول",
        expected: "توجيه إلى /user/main؛ رسائل تغيير كلمة المرور بالعربية في /user/settings",
      },
      {
        id: "2.4",
        title: "فتح /admin/signin",
        expected: "تحويل توافقي خلفي — الرابط القديم → /signin الموحّد",
      },
      {
        id: "2.5",
        title: "تسجيل مستخدم جديد + دخول/خروج JWT",
        expected: "تسجيل → /user/main؛ القبول في /Admin/volunteers/join-requests؛ إدارة المعتمدين في /Admin/volunteers",
      },
    ],
  },
  {
    key: "volunteer",
    trialPhase: 2,
    orderInPhase: 1,
    title: "بوابة المتطوّع",
    scenarios: [
      {
        id: "3.1",
        title: "دخول متطوّع ثم فتح /user/main",
        expected: "غلاف المتطوّع: ترحيب + روابط مهامي / معلوماتي / الإعدادات",
      },
      {
        id: "3.2",
        title: "فتح /user/tasks و /user/personal-info و /user/settings",
        expected: "الصفحات تعمل داخل UserShell؛ القائمة الجانبية أو الـ drawer على الجوال",
      },
      {
        id: "3.3",
        title: "محاولة فتح /Admin بحساب متطوّع",
        expected: "رفض أو تحويل — لا دخول لوحة الإدارة",
      },
    ],
  },
  {
    key: "admin_domains",
    trialPhase: 2,
    orderInPhase: 2,
    title: "لوحة الإدارة — سبعة نطاقات عمل",
    scenarios: [
      {
        id: "4.1",
        title: "/Admin نظرة عامة",
        role: "admin",
        expected: "بطاقة KPI لكل نطاق (المشاريع، المتطوعون، الطلبات، الكفالات، الخرائط، الكادر، التقارير) مع رابط للنطاق",
      },
      {
        id: "4.2",
        title: "الشريط الجانبي منظّم بالنطاقات السبعة",
        role: "admin",
        expected: "أسماء عربية موحّدة؛ لا ideas/suggest أو requests/service-requests كمسارات ظاهرة",
      },
      {
        id: "4.3",
        title: "نطاق المشاريع /Admin/projects",
        role: "admin",
        expected: "قائمة/إنشاء/أدوات + تعديل donation_url وdonation_label دون إعادة نشر",
      },
      {
        id: "4.4",
        title: "نطاق المتطوعون: /Admin/volunteers + applications + join-requests",
        role: "admin",
        expected: "إدارة المتطوعين وطلبات التطوع وطلبات الانضمام تعمل",
      },
      {
        id: "4.5",
        title: "نطاق الطلبات: /Admin/requests + water-supply + suggestions",
        role: "admin",
        expected: "طلبات الخدمات + سقيا الماء + الاقتراحات في مكان واحد",
      },
      {
        id: "4.6",
        title: "نطاق الكفالات /Admin/sponsorships",
        role: "admin",
        expected: "قائمة مشاريع الكفالات → فتح /projects/:slug/sponsorships",
      },
      {
        id: "4.7",
        title: "نطاق الخرائط /Admin/maps فقط",
        role: "admin",
        expected: "إدارة الخرائط/الطبقات/العناصر؛ لا مسار أدمن منفصل آخر للخرائط",
      },
      {
        id: "4.8",
        title: "نطاق الكادر /Admin/staff و /Admin/staff/manage",
        role: "admin",
        expected: "اللوحة وتغذية الأقسام/الموظفين/المهام داخل AdminShell",
      },
      {
        id: "4.9",
        title: "نطاق التقارير /Admin/reports",
        role: "admin",
        expected: "توليد/عرض التقارير يعمل",
      },
      {
        id: "4.10",
        title: "صلاحيات uat_pm",
        role: "uat_pm",
        expected: "يرى المشاريع/الخرائط/الكفالات ضمن نطاقه؛ /Admin ونطاقات المشرف → غير مرئية أو 403",
      },
    ],
  },
  {
    key: "redirects",
    trialPhase: 2,
    orderInPhase: 3,
    title: "توافق المسارات القديمة (روابط محفوظة)",
    scenarios: [
      { id: "5.1", title: "/Admin/map", expected: "→ /Admin/maps" },
      { id: "5.2", title: "/Admin/tasks", expected: "→ /Admin/projects/create" },
      { id: "5.3", title: "/Admin/ideas", expected: "→ /Admin/requests/suggestions" },
      { id: "5.4", title: "/Admin/applications", expected: "→ /Admin/volunteers/applications" },
      { id: "5.5", title: "/Admin/management", expected: "→ /Admin/volunteers" },
      { id: "5.6", title: "/Admin/service-requests", expected: "→ /Admin/requests" },
      { id: "5.7", title: "/Admin/executive و /executive", expected: "→ /Admin/staff" },
      { id: "5.8", title: "/Admin/executive/manage و /executive/manage", expected: "→ /Admin/staff/manage" },
      { id: "5.9", title: "/saqya", expected: "→ /projects/saqya" },
    ],
  },
  {
    key: "sponsorships",
    trialPhase: 3,
    orderInPhase: 1,
    title: "أداة الكفالات (/projects/:slug/sponsorships)",
    scenarios: [
      { id: "6.1", title: "إنشاء كفالة", role: "uat_donor", expected: "تُنشأ بحالة pending" },
      { id: "6.2", title: "اعتماد الكفالة → إسناد لمورّد ومندوب", role: "admin", expected: "Order ينتقل pending→assigned" },
      { id: "6.3", title: "تحضير → جاهز", role: "uat_supplier", expected: "إشعار للمندوب" },
      { id: "6.4", title: "تسليم + رفع توثيق بملف وGPS", role: "uat_rep", expected: "ملف خاص لا يُفتح إلا لمصرّح" },
      { id: "6.5", title: "دفع جزئي ثم محاولة تتجاوز المتبقي", role: "uat_donor", expected: "الثاني يُرفض «المبلغ يتجاوز المتبقّي»" },
      { id: "6.6", title: "اكتمال التمويل", expected: "الحالة → in_progress تلقائياً" },
      {
        id: "6.7",
        title: "رابط التبرع/المتجر من إعدادات المشروع",
        expected: "إن وُجد donation_url يُحقن في CTA؛ إن فارغ يُخفى الزر (لا زر ميت)",
      },
    ],
  },
  {
    key: "maps",
    trialPhase: 3,
    orderInPhase: 2,
    title: "أداة الخرائط — إدارة من نطاق الخرائط فقط",
    scenarios: [
      { id: "7.1", title: "/Admin/maps: إنشاء خريطة لمشروع", role: "admin", expected: "تُنشأ (provisioning للمشرف العام)" },
      { id: "7.2", title: "نفس المحاولة", role: "uat_pm", expected: "مرفوضة 403" },
      { id: "7.3", title: "طبقة خاصة + حقل select + حقل غير عام", role: "admin/uat_pm", expected: "في الأدمن فقط لا للعامة" },
      { id: "7.4", title: "عنصر بقيمة select خارج الخيارات", expected: "رفض 400 برسالة عربية" },
      { id: "7.5", title: "اعتماد → تنفيذ تعهد", role: "uat_pm", expected: "الملخص العام يعكسها مع إخفاء <5" },
      { id: "7.6", title: "نشر/إلغاء نشر", role: "admin", expected: "تظهر/تختفي في /map" },
    ],
  },
  {
    key: "integrity",
    trialPhase: 3,
    orderInPhase: 3,
    title: "سلامة البيانات (نهاية الجلسة)",
    scenarios: [
      {
        id: "8.1",
        title: "manage.py check_migration_integrity --expect migrated",
        expected: "«سلامة البيانات مؤكدة — لا اختلالات» — أي اختلال = ❌ فوري",
      },
    ],
  },
];

export const UAT_ACCOUNTS = [
  { email: "admin@takaful.com", password: "admin123", label: "المشرف العام → /Admin" },
  { email: "uat_pm@takaful.com", password: "Uat12345!", label: "مدير مشروع «تفقدهم» → /Admin/projects" },
  { email: "uat_vol@takaful.com", password: "Uat12345!", label: "متطوّع → /user/main" },
  { email: "uat_donor@takaful.com", password: "Uat12345!", label: "متبرّع كفالات" },
  { email: "uat_supplier@takaful.com", password: "Uat12345!", label: "مورّد" },
  { email: "uat_rep@takaful.com", password: "Uat12345!", label: "مندوب" },
];

/** عنوان التجربة المحلية */
export const UAT_LOCAL_BASE = "http://localhost:3400";
