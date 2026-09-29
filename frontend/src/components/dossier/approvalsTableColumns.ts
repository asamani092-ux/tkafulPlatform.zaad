/** أعمدة جدول الاعتمادات (وثيقة الإغلاق / الإكسل) — مصدر الحالة: تبويب الاعتمادات فقط. */
export const APPROVALS_EXCEL_COLUMNS: { key: string; label: string }[] = [
  { key: "role_title", label: "الصفة" },
  { key: "name", label: "الاسم" },
  { key: "email", label: "البريد" },
  { key: "status", label: "الحالة" },
  { key: "decided_at", label: "التاريخ" },
  { key: "rejection_reason", label: "سبب الرفض" },
];

export const APPROVALS_STATUS_AR: Record<string, string> = {
  pending: "بانتظار",
  approved: "معتمد",
  rejected: "مرفوض",
};
