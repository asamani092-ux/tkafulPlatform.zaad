// src/config.ts
// افتراضياً نفس الأصل ("") فتمرّ طلبات /api عبر بروكسي Vite إلى الخادم الخلفي،
// ويعمل ذلك على localhost وعلى معاينة Cursor الخارجية دون مشاكل CORS.
// يمكن تجاوزه بمتغيّر البيئة VITE_API_BASE_URL عند الحاجة (مثلاً للإنتاج).
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "";

/** رابط المتجر الخارجي للتفويض (delegate_association). فارغ = وضع تجريبي. */
export const EXTERNAL_STORE_URL =
  import.meta.env.VITE_EXTERNAL_STORE_URL || "";
