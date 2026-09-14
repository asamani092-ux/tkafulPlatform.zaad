/** توليد مفتاح/رابط تلقائي من تسمية عربية أو لاتينية — O(n) على طول النص. */
export function autoSlugFromLabel(label: string, fallbackPrefix = "f"): string {
  const cleaned = label
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w\u0600-\u06FF-]+/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
  return cleaned || `${fallbackPrefix}-${Date.now().toString(36)}`;
}

export function autoFieldKeyFromLabel(label: string): string {
  return autoSlugFromLabel(label, "field").replace(/-/g, "_");
}
