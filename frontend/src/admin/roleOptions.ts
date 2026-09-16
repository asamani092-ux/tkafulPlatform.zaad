import { ROLE_AR } from "../i18n/labels";

/** الأدوار الثلاثة الأساسية لتعيين ملفّات المستخدمين (بدون أدوار المشروع project_*). */
export const PLATFORM_ROLE_IDS = [
  "admin",
  "employee",
  "user",
] as const;

export type PlatformRoleId = (typeof PLATFORM_ROLE_IDS)[number];

export const PLATFORM_ROLE_OPTIONS = PLATFORM_ROLE_IDS.map((id) => ({
  value: id,
  label: ROLE_AR[id] ?? id,
}));
