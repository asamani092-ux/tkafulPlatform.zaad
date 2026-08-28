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
