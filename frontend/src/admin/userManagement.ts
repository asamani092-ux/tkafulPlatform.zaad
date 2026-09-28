/**
 * مساعدات إدارة المستخدمين — دوال نقية قابلة للاختبار.
 * التعقيد: applyUserFilters O(N)، extractErrorDetail O(1).
 */
import { passwordErrorsToAr } from "../utils/passwordErrors";

export interface AdminUserRow {
  id: number;
  email: string;
  name: string;
  role: string;
  is_active: boolean;
  date_joined: string;
  last_login: string | null;
}

export function applyUserFilters(
  rows: AdminUserRow[],
  search: string,
  role: string,
  status: "" | "active" | "disabled",
): AdminUserRow[] {
  const q = search.trim().toLowerCase();
  return rows.filter((r) => {
    if (q && !r.email.toLowerCase().includes(q) && !(r.name || "").toLowerCase().includes(q)) {
      return false;
    }
    if (role && r.role !== role) return false;
    if (status === "active" && !r.is_active) return false;
    if (status === "disabled" && r.is_active) return false;
    return true;
  });
}

const DRF_EN_TO_AR: Array<[RegExp, string]> = [
  [/this field is required\.?/i, "هذا الحقل مطلوب"],
  [/this field may not be blank\.?/i, "هذا الحقل مطلوب"],
  [/enter a valid email address\.?/i, "أدخل بريداً إلكترونياً صالحاً"],
  [/a valid integer is required\.?/i, "أدخل رقماً صحيحاً"],
  [/ensure this field has no more than/i, "تجاوز الحقل الحد الأقصى للطول"],
  [/no active account found with the given credentials/i, "البريد الإلكتروني أو كلمة المرور غير صحيحة"],
  [/\bin_app\b/i, "إشعار في المنصة"],
  [/\bemail\b/i, "البريد"],
];

function translateDrfEn(msg: string): string {
  if (/[\u0600-\u06FF]/.test(msg)) return msg;
  for (const [re, ar] of DRF_EN_TO_AR) {
    if (re.test(msg)) return ar;
  }
  if (/password|too short|too common|numeric|similar/i.test(msg)) {
    return passwordErrorsToAr([msg]);
  }
  return msg;
}

export function extractErrorDetail(body: unknown): string {
  if (!body || typeof body !== "object") return "تعذّر تنفيذ العملية";
  const rec = body as Record<string, unknown>;
  if (typeof rec.detail === "string") return translateDrfEn(rec.detail);
  if (Array.isArray(rec.detail) && typeof rec.detail[0] === "string") {
    return translateDrfEn(rec.detail[0]);
  }
  if (rec.password != null) {
    return passwordErrorsToAr(rec.password);
  }
  const firstKey = Object.keys(rec).find(
    (k) => Array.isArray(rec[k]) && typeof (rec[k] as unknown[])[0] === "string",
  );
  if (firstKey) {
    const arr = rec[firstKey] as string[];
    if (firstKey === "password" || /password/i.test(firstKey)) {
      return passwordErrorsToAr(arr);
    }
    return translateDrfEn(arr[0]);
  }
  return "تعذّر تنفيذ العملية";
}
