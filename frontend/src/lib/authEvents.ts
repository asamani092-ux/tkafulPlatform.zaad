/**
 * جسر انتهاء الجلسة بين طبقة الـ API (خارج شجرة React) وطبقة التوجيه (داخلها).
 *
 * المشكلة الجذرية (RC-B): كان `authFetch` يعيد تحميل الصفحة كاملة عبر
 * `window.location.href` عند فشل تجديد التوكن، فيخرج المستخدم قسراً بإعادة تحميل.
 * الحل: تسجّل طبقة التوجيه معالجاً يستخدم تنقّل React Router دون إعادة تحميل.
 *
 * O(1) لكل استدعاء.
 */

type SessionExpiredHandler = () => void;

let handler: SessionExpiredHandler | null = null;

/** تسجّله طبقة التوجيه (AppContent) عبر useEffect. يعيد دالة إلغاء التسجيل. */
export function registerSessionExpiredHandler(fn: SessionExpiredHandler): () => void {
  handler = fn;
  return () => {
    if (handler === fn) handler = null;
  };
}

/** يستدعيه `authFetch` عند انتهاء الجلسة الحقيقي (فشل التجديد). */
export function notifySessionExpired(): void {
  if (handler) handler();
}
