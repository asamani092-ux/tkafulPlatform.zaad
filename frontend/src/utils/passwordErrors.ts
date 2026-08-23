/** ترجمة رسائل كلمة المرور الشائعة — O(n). */
export function passwordErrorsToAr(detail: string | string[] | undefined): string {
  const parts = Array.isArray(detail) ? detail : detail ? [detail] : [];
  return parts.map((msg) => {
    const lower = msg.toLowerCase();
    if (lower.includes("too short") || lower.includes("at least")) return "كلمة المرور قصيرة جداً (8 أحرف على الأقل).";
    if (lower.includes("too common")) return "كلمة المرور شائعة جداً — اختر كلمة أقوى.";
    if (lower.includes("entirely numeric")) return "لا يمكن أن تكون كلمة المرور أرقاماً فقط.";
    if (lower.includes("too similar")) return "كلمة المرور قريبة جداً من بياناتك الشخصية.";
    return msg;
  }).join(" • ") || "حاول مرة أخرى";
}
