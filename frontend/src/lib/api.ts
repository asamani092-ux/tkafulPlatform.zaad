import { API_BASE_URL } from "../config";
import { notifySessionExpired } from "./authEvents";

/**
 * عميل API موحّد:
 * - يضيف ترويسة Bearer تلقائياً من localStorage.
 * - عند 401 يحاول تجديد التوكن عبر refresh مرة واحدة ثم يعيد الطلب.
 * - عند فشل التجديد الحقيقي: يمسح الجلسة ويُبلّغ طبقة التوجيه للانتقال
 *   لصفحة الدخول عبر React Router (دون إعادة تحميل كاملة — RC-B).
 * - 403 (جلسة صالحة لكن المورد غير مصرّح): يُعاد كما هو ولا تُمسّ الجلسة إطلاقاً.
 *
 * يحافظ على نفس مفاتيح التخزين المستخدمة في AuthContext.
 */

const ACCESS_KEY = "accessToken";
const REFRESH_KEY = "refreshToken";

function getAccess() {
  return localStorage.getItem(ACCESS_KEY);
}

function clearSession() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem("takaful_user");
}

async function tryRefresh(): Promise<string | null> {
  const refresh = localStorage.getItem(REFRESH_KEY);
  if (!refresh) return null;
  try {
    const res = await fetch(`${API_BASE_URL}/api/accounts/auth/token/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.access) {
      localStorage.setItem(ACCESS_KEY, data.access);
      // عند تدوير التوكن قد يرجع refresh جديد
      if (data.refresh) localStorage.setItem(REFRESH_KEY, data.refresh);
      return data.access;
    }
    return null;
  } catch {
    return null;
  }
}

function withAuth(options: RequestInit, token: string | null): RequestInit {
  const headers = new Headers(options.headers || {});
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return { ...options, headers };
}

/**
 * طلب مصادق مع تجديد تلقائي للتوكن عند 401. `path` يبدأ بـ /api/...
 *
 * قاعدة الحالة:
 * - 401 + نجاح التجديد → إعادة الطلب بصمت (الجلسة محفوظة).
 * - 401 + فشل التجديد → انتهاء جلسة حقيقي: مسح + إبلاغ الراوتر (لا إعادة تحميل).
 * - 403 → يُعاد كما هو؛ لا مساس بالجلسة (مصرّح دخولاً، ممنوع المورد).
 */
export async function authFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const url = `${API_BASE_URL}${path}`;
  let res = await fetch(url, withAuth(options, getAccess()));

  if (res.status === 401) {
    const newAccess = await tryRefresh();
    if (newAccess) {
      res = await fetch(url, withAuth(options, newAccess));
      // إن بقي 401 بعد تجديد ناجح فالجلسة منتهية فعلاً.
      if (res.status === 401) {
        clearSession();
        notifySessionExpired();
      }
    } else {
      clearSession();
      notifySessionExpired();
    }
  }
  // 403 وغيرها: تُعاد كما هي دون أي تأثير على الجلسة.
  return res;
}
