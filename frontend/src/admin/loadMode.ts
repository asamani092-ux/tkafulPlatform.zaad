/**
 * فصل التحميل الأولي عن تحديث الطفرات — يمنع setLoading(true) من إعادة تركيب الصفحة.
 * التعقيد: O(1).
 */
export type AdminLoadMode = "initial" | "silent";

/** هل يجب قلب بوابة التحميل على مستوى الصفحة؟ فقط للتحميل الأولي. */
export function shouldFlipPageLoading(mode: AdminLoadMode): boolean {
  return mode === "initial";
}
