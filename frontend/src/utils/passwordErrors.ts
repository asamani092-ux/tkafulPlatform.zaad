/** ترجمة رسائل كلمة المرور الشائعة — O(n). */
export function passwordErrorsToAr(detail: unknown): string {
  const parts = flattenPasswordErrors(detail);
  return parts.map((msg) => {
    const lower = msg.toLowerCase();
    if (/[\u0600-\u06FF]/.test(msg)) return msg;
    if (lower.includes("too short") || lower.includes("at least") || lower.includes("minimum")) {
      return "كلمة المرور قصيرة جداً (8 أحرف على الأقل).";
    }
    if (lower.includes("too common") || lower.includes("common")) {
      return "كلمة المرور شائعة جداً — اختر كلمة أقوى.";
    }
    if (lower.includes("entirely numeric") || lower.includes("numeric")) {
      return "لا يمكن أن تكون كلمة المرور أرقاماً فقط.";
    }
    if (lower.includes("too similar") || lower.includes("similar")) {
      return "كلمة المرور قريبة جداً من بياناتك الشخصية.";
    }
    if (lower.includes("required") || lower.includes("blank")) {
      return "كلمة المرور الجديدة مطلوبة.";
    }
    return "تعذّر قبول كلمة المرور — اختر كلمة أقوى وحاول مرة أخرى.";
  }).join(" • ") || "تعذّر تحديث كلمة المرور — حاول مرة أخرى.";
}

function flattenPasswordErrors(detail: unknown): string[] {
  if (detail == null) return [];
  if (typeof detail === "string") return [detail];
  if (Array.isArray(detail)) {
    return detail.flatMap((x) => flattenPasswordErrors(x));
  }
  if (typeof detail === "object") {
    return Object.values(detail as Record<string, unknown>).flatMap((x) => flattenPasswordErrors(x));
  }
  return [String(detail)];
}
