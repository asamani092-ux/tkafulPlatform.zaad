/** نداءات API لمنصّة المشاريع ونظام الخرائط — قراءة عامة بدون مصادقة. */
import { API_BASE_URL } from "../../../config";
import type {
  MapSummaryInfo,
  PlatformProject,
  PublicMapDetail,
  PublicMapIndexEntry,
  PublicProjectDetail,
} from "./types";

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`);
  if (!res.ok) throw new Error(`fetch ${path} → ${res.status}`);
  return res.json() as Promise<T>;
}

export const fetchPublicProjects = () =>
  getJson<PlatformProject[]>("/api/platform/public/projects/");

export const fetchPublicProject = (slug: string) =>
  getJson<PublicProjectDetail>(`/api/platform/public/projects/${slug}/`);

export const fetchPublicMapsIndex = (projectSlug?: string) =>
  getJson<PublicMapIndexEntry[]>(
    `/api/maps/public/${projectSlug ? `?project=${encodeURIComponent(projectSlug)}` : ""}`,
  );

export const fetchPublicMapDetail = (mapId: number) =>
  getJson<PublicMapDetail>(`/api/maps/public/${mapId}/`);

export const fetchPublicMapSummary = (mapId: number) =>
  getJson<MapSummaryInfo>(`/api/maps/public/${mapId}/summary/`);

export async function submitMapContribution(
  mapId: number,
  payload: {
    item?: number | null;
    category?: string;
    name: string;
    phone: string;
    mode: string;
    quantity: number;
    note?: string;
  },
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/maps/public/${mapId}/contributions/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg =
        data.phone?.[0] || data.quantity?.[0] || data.item?.[0] || data.detail ||
        "تعذّر إرسال التعهد";
      return { ok: false, error: typeof msg === "string" ? msg : JSON.stringify(msg) };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "تعذّر الاتصال بالخادم" };
  }
}
