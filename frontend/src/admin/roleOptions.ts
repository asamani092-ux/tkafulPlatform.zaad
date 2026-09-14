import { ROLE_AR } from "../i18n/labels";

/** الأدوار الثمانية لملفّات المستخدمين (بدون أدوار المشروع project_*). */
export const PLATFORM_ROLE_IDS = [
  "admin",
  "manager",
  "employee",
  "user",
  "beneficiary",
  "donor",
  "supplier",
  "representative",
] as const;

export type PlatformRoleId = (typeof PLATFORM_ROLE_IDS)[number];

export const PLATFORM_ROLE_OPTIONS = PLATFORM_ROLE_IDS.map((id) => ({
  value: id,
  label: ROLE_AR[id] ?? id,
}));
