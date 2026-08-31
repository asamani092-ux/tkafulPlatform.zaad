/**
 * Phase B — مصادر حقيقة واحدة لنطاقات لوحة الإدارة السبعة
 * ومساراتها القانونية + تحويلات المسارات القديمة.
 */

export type AdminDomainId =
  | "overview"
  | "projects"
  | "users"
  | "volunteers"
  | "requests"
  | "maps"
  | "reports"
  | "settings";

export interface AdminNavLink {
  to: string;
  label: string;
  /** يظهر لعضو المشروع (staff) وليس للمشرف العام فقط */
  staffVisible?: boolean;
}

export interface AdminDomain {
  id: AdminDomainId;
  label: string;
  to: string;
  /** وصف مختصر لبطاقة الملخص */
  blurb: string;
  links: AdminNavLink[];
  /** للمشرف العام فقط إن true؛ وإلا يظهر أيضاً لـ staff عند staffVisible على الروابط */
  superAdminOnly?: boolean;
}

/** الشريط الجانبي المنظّم بنطاقات العمل */
export const ADMIN_DOMAINS: AdminDomain[] = [
  {
    id: "projects",
    label: "المشاريع",
    to: "/Admin/projects",
    blurb: "قائمة المشاريع والأدوات وروابط التبرع والإنشاء",
    links: [
      { to: "/Admin/projects", label: "كل المشاريع", staffVisible: true },
    ],
  },
  {
    id: "users",
    label: "المستخدمون",
    to: "/Admin/users",
    blurb: "حسابات المنصّة والأدوار (مستخدم/مشرف/متبرّع…) — ليست أقسام الكادر التشغيلية",
    superAdminOnly: true,
    links: [
      { to: "/Admin/users", label: "إدارة المستخدمين" },
    ],
  },
  {
    id: "volunteers",
    label: "المتطوعون",
    to: "/Admin/volunteers",
    blurb: "إدارة المتطوعين وطلبات المشاريع وطلبات الانضمام",
    superAdminOnly: true,
    links: [
      // تبويبات الصفحة الداخلية تغني عن روابط فرعية مكررة في الشريط
      { to: "/Admin/volunteers", label: "المتطوعون" },
    ],
  },
  {
    id: "requests",
    label: "الطلبات",
    to: "/Admin/requests/forms",
    blurb: "نماذج طلبات ديناميكية مرتبطة بمشروع وعرض الإرسالات",
    superAdminOnly: true,
    links: [
      { to: "/Admin/requests/forms", label: "النماذج والإرسالات" },
    ],
  },
  {
    id: "maps",
    label: "الخرائط",
    to: "/Admin/maps",
    blurb: "إنشاء خريطة ونشرها مع طبقات وعناصر",
    links: [
      { to: "/Admin/maps", label: "إدارة الخرائط", staffVisible: true },
    ],
  },
  {
    id: "reports",
    label: "التقارير",
    to: "/Admin/reports",
    blurb: "تقارير المنصّة + أداء الكادر التشغيلي (أقسام/موظفون/مهام) — منفصل عن «المستخدمون»",
    superAdminOnly: true,
    links: [
      { to: "/Admin/reports", label: "التقارير" },
      { to: "/Admin/staff", label: "أداء الكادر" },
      { to: "/Admin/staff/manage", label: "تغذية الكادر" },
    ],
  },
  {
    id: "settings",
    label: "الإعدادات",
    to: "/Admin/settings",
    blurb: "اسم المنصّة والتواصل وأعلام الأدوات والصفحات الثابتة",
    superAdminOnly: true,
    links: [
      { to: "/Admin/settings", label: "إعدادات المنصّة" },
      { to: "/Admin/settings/broadcast", label: "بث إشعار" },
      { to: "/Admin/settings/roles", label: "الأدوار" },
      { to: "/Admin/settings/activity", label: "سجل النشاط" },
      { to: "/Admin/settings/project-types", label: "أنواع المشاريع" },
    ],
  },
];

/**
 * تحويلات المسارات القديمة → القانونية (Phase B + UAT P3).
 * نطاق الطلبات موحّد على النماذج الديناميكية.
 */
export const LEGACY_ADMIN_REDIRECTS: Array<{ from: string; to: string }> = [
  { from: "/Admin/map", to: "/Admin/maps" },
  // إنشاء المشروع صار داخل /Admin/projects — الرابط القديم يُبقى توافقياً
  { from: "/Admin/projects/create", to: "/Admin/projects" },
  { from: "/Admin/tasks", to: "/Admin/projects" },
  { from: "/Admin/ideas", to: "/Admin/requests/forms" },
  { from: "/Admin/applications", to: "/Admin/volunteers/applications" },
  { from: "/Admin/management", to: "/Admin/volunteers" },
  { from: "/Admin/service-requests", to: "/Admin/requests/forms" },
  { from: "/Admin/requests", to: "/Admin/requests/forms" },
  { from: "/Admin/requests/water-supply", to: "/Admin/requests/forms" },
  { from: "/Admin/requests/suggestions", to: "/Admin/requests/forms" },
  { from: "/Admin/join-requests", to: "/Admin/volunteers/join-requests" },
  // الكفالات صارت أداة داخل بطاقة المشروع — النطاق المنفصل يُحوّل توافقياً
  { from: "/Admin/sponsorships", to: "/Admin/projects" },
  { from: "/Admin/executive", to: "/Admin/staff" },
  { from: "/Admin/executive/manage", to: "/Admin/staff/manage" },
  { from: "/executive", to: "/Admin/staff" },
  { from: "/executive/manage", to: "/Admin/staff/manage" },
  { from: "/admin/signin", to: "/signin" },
  { from: "/saqya", to: "/projects/saqya" },
];

/** مسارات التحويل المسجّلة في الراوتر */
export const ACTIVE_LEGACY_REDIRECTS = LEGACY_ADMIN_REDIRECTS;

/** تحديد النطاق النشط من المسار */
export function domainForPath(pathname: string): AdminDomainId | "overview" {
  const p = pathname.toLowerCase();
  if (p === "/admin" || p === "/admin/") return "overview";
  if (p.startsWith("/admin/projects")) return "projects";
  if (p.startsWith("/admin/users")) return "users";
  if (p.startsWith("/admin/volunteers")) return "volunteers";
  if (p.startsWith("/admin/requests")) return "requests";
  if (p.startsWith("/admin/maps") || p === "/admin/map") return "maps";
  // الكادر صار تحت نطاق التقارير (توحيد)
  if (p.startsWith("/admin/staff") || p.startsWith("/admin/executive") || p.startsWith("/admin/reports")) return "reports";
  if (p.startsWith("/admin/settings")) return "settings";
  return "overview";
}
