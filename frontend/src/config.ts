// src/config.ts
// افتراضياً نفس الأصل ("") فتمرّ طلبات /api عبر بروكسي Vite إلى الخادم الخلفي،
// ويعمل ذلك على localhost وعلى معاينة Cursor الخارجية دون مشاكل CORS.
// يمكن تجاوزه بمتغيّر البيئة VITE_API_BASE_URL عند الحاجة (مثلاً للإنتاج).
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "";

/** رابط المتجر الخارجي للتفويض (delegate_association). فارغ = وضع تجريبي. */
export const EXTERNAL_STORE_URL =
  import.meta.env.VITE_EXTERNAL_STORE_URL || "";

/** إظهار نموذج طلب سقيا الماء في الواجهة العامة — false لإخفاء الروابط والنموذج. */
export const WATER_SUPPLY_FORM_ENABLED =
  import.meta.env.VITE_ENABLE_WATER_SUPPLY_FORM !== "false";
