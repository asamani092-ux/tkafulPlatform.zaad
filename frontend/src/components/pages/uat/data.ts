/** بيانات نموذج تقييم القبول (UAT) — ثلاث مراحل تجربة. */

export interface UatScenario {
  id: string;
  title: string;
  role?: string;
  expected: string;
}

export interface UatSection {
  key: string;
  title: string;
  trialPhase: 1 | 2 | 3;
  scenarios: UatScenario[];
}

export const UAT_TRIAL_PHASES = [
  {
    id: 1 as const,
    title: "المرحلة 1",
    subtitle: "الموقع العام والدخول",
    goal: "تجربة الزائر ثم حسابات الدخول والتوجيه حسب الدور.",
  },
  {
    id: 2 as const,
    title: "المرحلة 2",
    subtitle: "بوابة المتطوّع ولوحة الإدارة",
    goal: "مسارات /user ونطاقات الإدارة السبعة + التحويلات القديمة.",
  },
  {
    id: 3 as const,
    title: "المرحلة 3",
    subtitle: "أدوات التشغيل والجودة",
    goal: "دورة الكفالات، إدارة الخرائط، ثم فحص سلامة البيانات.",
  },
];

export function sectionsForPhase(phase: 1 | 2 | 3): UatSection[] {
  return UAT_SECTIONS.filter((s) => s.trialPhase === phase);
}

export const UAT_SECTIONS: UatSection[] = [
  {
    key: "public",
    trialPhase: 1,
    title: "1) الموقع العام (بدون دخول)",
    scenarios: [
      {
        id: "1.1",
        title: "فتح / على المنفذ 3400",
        expected: "الصفحة الرئيسية: مقدّمة المنصّة + مشاريع نشطة + أرقام أثر + خدمات؛ زر تبرع يظهر فقط إن وُجد donation_url",
      },
      {
        id: "1.2",
        title: "التنقّل العام (Navbar): الرئيسية · المشاريع · الخدمات · المتطوعون · الخرائط · من نحن",
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
        expected: "صفحة هبوط: الهوية + الأدوات المفعّلة فقط + تبرع إن وُجد donation_url",
      },
      {
        id: "1.5",
        title: "فتح /map",
        expected: "مجمّع عام واحد: KPI + فلترة بالمشروع + فلاتر ديناميكية + وسيلة إيضاح + مساهمة من العنصر",
      },
      {
        id: "1.6",
        title: "فتح /projects/tafaqqadhum/map",
        expected: "خريطة المشروع فقط؛ عناصر/فلاتر ديناميكية؛ لا إدارة أدمن من هنا",
      },
      {
        id: "1.7",
        title: "إرسال تعهد من الخريطة (اسم + 05XXXXXXXX + كمية)",
        expected: "«تم استلام تعهدكم بنجاح» وحالته pending",
      },
      {
        id: "1.8",
        title: "فتح /saqya",
        expected: "تحويل إلى /projects/saqya/sponsorships",
      },
      {
        id: "1.9",
        title: "فتح /services/water-supply?project=saqya",
        expected: "نموذج سقيا يعمل ويعرض ارتباط المشروع؛ الطلب يظهر لاحقاً في /Admin/requests/water-supply",
      },
      {
        id: "1.10",
        title: "فتح /suggest و /request-service",
        expected: "النماذج العامة تعمل كما قبل",
      },
    ],
  },
  {
    key: "auth",
    trialPhase: 1,
    title: "2) الدخول الموحّد والتوجيه حسب الدور",
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
        expected: "توجيه إلى /Admin/projects؛ يرى مشروع «تفقدهم» فقط",
      },
      {
        id: "2.3",
        title: "متطوع / مستخدم عادي بعد الدخول",
        expected: "توجيه إلى /user/main",
      },
      {
        id: "2.4",
        title: "فتح /admin/signin",
        expected: "تحويل إلى /signin",
      },
      {
        id: "2.5",
        title: "تسجيل مستخدم جديد + دخول/خروج JWT",
        expected: "بلا كسر سلوكي",
      },
    ],
  },
  {
    key: "volunteer",
    trialPhase: 2,
    title: "3) بوابة المتطوّع",
    scenarios: [
      {
        id: "8.1",
        title: "دخول متطوّع ثم فتح /user/main",
        expected: "غلاف المتطوّع: ترحيب + روابط مهامي / معلوماتي / الإعدادات",
      },
      {
        id: "8.2",
        title: "فتح /user/tasks و /user/personal-info و /user/settings",
        expected: "الصفحات تعمل داخل UserShell؛ القائمة الجانبية أو الـ drawer على الجوال",
      },
      {
        id: "8.3",
        title: "محاولة فتح /Admin بحساب متطوّع",
        expected: "رفض أو تحويل — لا دخول لوحة الإدارة",
      },
    ],
  },
  {
    key: "admin_domains",
    trialPhase: 2,
    title: "4) لوحة الإدارة — سبعة نطاقات عمل",
    scenarios: [
      {
        id: "3.1",
        title: "/Admin نظرة عامة",
        role: "admin",
        expected: "بطاقة KPI لكل نطاق (المشاريع، المتطوعون، الطلبات، الكفالات، الخرائط، الكادر، التقارير) مع رابط للنطاق",
      },
      {
        id: "3.2",
        title: "الشريط الجانبي منظّم بالنطاقات السبعة",
        role: "admin",
        expected: "أسماء عربية موحّدة؛ لا ideas/suggest أو requests/service-requests كمسارات ظاهرة",
      },
      {
        id: "3.3",
        title: "نطاق المشاريع /Admin/projects",
        role: "admin",
        expected: "قائمة/إنشاء/أدوات + تعديل donation_url وdonation_label دون إعادة نشر",
      },
      {
        id: "3.4",
        title: "نطاق المتطوعون: /Admin/volunteers + applications + join-requests",
        role: "admin",
        expected: "إدارة المتطوعين وطلبات التطوع وطلبات الانضمام تعمل",
      },
      {
        id: "3.5",
        title: "نطاق الطلبات: /Admin/requests + water-supply + suggestions",
        role: "admin",
        expected: "طلبات الخدمات + سقيا الماء + الاقتراحات في مكان واحد",
      },
      {
        id: "3.6",
        title: "نطاق الكفالات /Admin/sponsorships",
        role: "admin",
        expected: "قائمة مشاريع الكفالات → فتح /projects/:slug/sponsorships",
      },
      {
        id: "3.7",
        title: "نطاق الخرائط /Admin/maps فقط",
        role: "admin",
        expected: "إدارة الخرائط/الطبقات/العناصر؛ لا مسار أدمن منفصل آخر للخرائط",
      },
      {
        id: "3.8",
        title: "نطاق الكادر /Admin/staff و /Admin/staff/manage",
        role: "admin",
        expected: "اللوحة وتغذية الأقسام/الموظفين/المهام داخل AdminShell",
      },
      {
        id: "3.9",
        title: "نطاق التقارير /Admin/reports",
        role: "admin",
        expected: "توليد/عرض التقارير يعمل",
      },
      {
        id: "3.10",
        title: "صلاحيات uat_pm",
        role: "uat_pm",
        expected: "يرى المشاريع/الخرائط/الكفالات ضمن نطاقه؛ /Admin ونطاقات المشرف → غير مرئية أو 403",
      },
    ],
  },
  {
    key: "redirects",
    trialPhase: 2,
    title: "5) توافق المسارات القديمة (يجب ألا تنكسر روابط محفوظة)",
    scenarios: [
      { id: "4.1", title: "/Admin/map", expected: "→ /Admin/maps" },
      { id: "4.2", title: "/Admin/tasks", expected: "→ /Admin/projects/create" },
      { id: "4.3", title: "/Admin/ideas", expected: "→ /Admin/requests/suggestions" },
      { id: "4.4", title: "/Admin/applications", expected: "→ /Admin/volunteers/applications" },
      { id: "4.5", title: "/Admin/management", expected: "→ /Admin/volunteers" },
      { id: "4.6", title: "/Admin/service-requests", expected: "→ /Admin/requests" },
      { id: "4.7", title: "/Admin/executive و /executive", expected: "→ /Admin/staff" },
      { id: "4.8", title: "/Admin/executive/manage و /executive/manage", expected: "→ /Admin/staff/manage" },
      { id: "4.9", title: "/saqya", expected: "→ /projects/saqya/sponsorships" },
    ],
  },
  {
    key: "sponsorships",
    trialPhase: 3,
    title: "6) أداة الكفالات (مسارها القانوني /projects/:slug/sponsorships)",
    scenarios: [
      { id: "5.1", title: "إنشاء كفالة", role: "uat_donor", expected: "تُنشأ بحالة pending" },
      { id: "5.2", title: "اعتماد الكفالة → إسناد لمورّد ومندوب", role: "admin", expected: "Order ينتقل pending→assigned" },
      { id: "5.3", title: "تحضير → جاهز", role: "uat_supplier", expected: "إشعار للمندوب" },
      { id: "5.4", title: "تسليم + رفع توثيق بملف وGPS", role: "uat_rep", expected: "ملف خاص لا يُفتح إلا لمصرّح" },
      { id: "5.5", title: "دفع جزئي ثم محاولة تتجاوز المتبقي", role: "uat_donor", expected: "الثاني يُرفض «المبلغ يتجاوز المتبقّي»" },
      { id: "5.6", title: "اكتمال التمويل", expected: "الحالة → in_progress تلقائياً" },
      {
        id: "5.7",
        title: "رابط التبرع/المتجر من إعدادات المشروع",
        expected: "إن وُجد donation_url يُحقن في CTA؛ إن فارغ يُخفى الزر (لا زر ميت)",
      },
    ],
  },
  {
    key: "maps",
    trialPhase: 3,
    title: "7) أداة الخرائط — إدارة من نطاق الخرائط فقط",
    scenarios: [
      { id: "6.1", title: "/Admin/maps: إنشاء خريطة لمشروع", role: "admin", expected: "تُنشأ (provisioning للمشرف العام)" },
      { id: "6.2", title: "نفس المحاولة", role: "uat_pm", expected: "مرفوضة 403" },
      { id: "6.3", title: "طبقة خاصة + حقل select + حقل غير عام", role: "admin/uat_pm", expected: "في الأدمن فقط لا للعامة" },
      { id: "6.4", title: "عنصر بقيمة select خارج الخيارات", expected: "رفض 400 برسالة عربية" },
      { id: "6.5", title: "اعتماد → تنفيذ تعهد", role: "uat_pm", expected: "الملخص العام يعكسها مع إخفاء <5" },
      { id: "6.6", title: "نشر/إلغاء نشر", role: "admin", expected: "تظهر/تختفي في /map" },
    ],
  },
  {
    key: "integrity",
    trialPhase: 3,
    title: "8) سلامة البيانات (نهاية الجلسة)",
    scenarios: [
      {
        id: "7.1",
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
