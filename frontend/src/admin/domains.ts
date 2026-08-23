/**
 * Phase B — مصادر حقيقة واحدة لنطاقات لوحة الإدارة السبعة
 * ومساراتها القانونية + تحويلات المسارات القديمة.
 */

export type AdminDomainId =
  | "overview"
  | "projects"
  | "volunteers"
  | "requests"
  | "sponsorships"
  | "maps"
  | "staff"
  | "reports";

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
    blurb: "قائمة المشاريع والأدوات وروابط التبرع",
    links: [
      { to: "/Admin/projects", label: "كل المشاريع", staffVisible: true },
      { to: "/Admin/projects/create", label: "إنشاء مشروع" },
    ],
  },
  {
    id: "volunteers",
    label: "المتطوعون",
    to: "/Admin/volunteers",
    blurb: "المتطوعون والطلبات والتعيينات",
    superAdminOnly: true,
    links: [
      { to: "/Admin/volunteers", label: "إدارة المتطوعين" },
      { to: "/Admin/volunteers/applications", label: "طلبات التطوع" },
      { to: "/Admin/volunteers/join-requests", label: "طلبات الانضمام" },
    ],
  },
  {
    id: "requests",
    label: "الطلبات",
    to: "/Admin/requests",
    blurb: "طلبات الخدمات وسقيا الماء والاقتراحات",
    superAdminOnly: true,
    links: [
      { to: "/Admin/requests", label: "طلبات الخدمات" },
      { to: "/Admin/requests/water-supply", label: "طلبات سقيا الماء" },
      { to: "/Admin/requests/suggestions", label: "الاقتراحات" },
    ],
  },
  {
    id: "sponsorships",
    label: "الكفالات",
    to: "/Admin/sponsorships",
    blurb: "بوابات الكفالات حسب المشروع",
    links: [
      { to: "/Admin/sponsorships", label: "مشاريع الكفالات", staffVisible: true },
    ],
  },
  {
    id: "maps",
    label: "الخرائط",
    to: "/Admin/maps",
    blurb: "إدارة الخرائط والطبقات والعناصر",
    links: [
      { to: "/Admin/maps", label: "إدارة الخرائط", staffVisible: true },
    ],
  },
  {
    id: "staff",
    label: "الكادر",
    to: "/Admin/staff",
    blurb: "الأقسام والموظفين ومهام الكادر ومؤشرات الأداء",
    links: [
      { to: "/Admin/staff", label: "لوحة الكادر", staffVisible: true },
      { to: "/Admin/staff/manage", label: "تغذية اللوحة", staffVisible: true },
    ],
  },
  {
    id: "reports",
    label: "التقارير",
    to: "/Admin/reports",
    blurb: "التقارير والإحصاءات والأهداف الربعية",
    superAdminOnly: true,
    links: [
      { to: "/Admin/reports", label: "التقارير" },
    ],
  },
];

/**
 * تحويلات المسارات القديمة → القانونية (Phase B).
 * ملاحظة: `/Admin/requests` أصبح نطاق الطلبات (خدمات) — طلبات الانضمام
 * كانت عليه سابقاً وانتقلت إلى `/Admin/volunteers/join-requests`.
 */
export const LEGACY_ADMIN_REDIRECTS: Array<{ from: string; to: string }> = [
  { from: "/Admin/map", to: "/Admin/maps" },
  { from: "/Admin/tasks", to: "/Admin/projects/create" },
  { from: "/Admin/ideas", to: "/Admin/requests/suggestions" },
  { from: "/Admin/applications", to: "/Admin/volunteers/applications" },
  { from: "/Admin/management", to: "/Admin/volunteers" },
  { from: "/Admin/service-requests", to: "/Admin/requests" },
  { from: "/Admin/join-requests", to: "/Admin/volunteers/join-requests" },
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
  if (p.startsWith("/admin/volunteers")) return "volunteers";
  if (p.startsWith("/admin/requests")) return "requests";
  if (p.startsWith("/admin/sponsorships")) return "sponsorships";
  if (p.startsWith("/admin/maps") || p === "/admin/map") return "maps";
  if (p.startsWith("/admin/staff") || p.startsWith("/admin/executive")) return "staff";
  if (p.startsWith("/admin/reports")) return "reports";
  return "overview";
}
