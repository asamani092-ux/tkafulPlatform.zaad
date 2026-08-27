/** حفظ حالة نموذج UAT في localStorage — O(k) زمن/مكان حيث k عدد الإدخالات. */
import type { UatState } from "./report";

export const UAT_STORAGE_KEY = "takaful_uat_state";

export interface UatPersisted {
  version: 1;
  state: UatState;
  phase: 1 | 2 | 3;
}

const EMPTY_STATE: UatState = { tester: "", verdict: "", statuses: {}, notes: {} };

function isUatStatus(v: unknown): v is "pass" | "warn" | "fail" {
  return v === "pass" || v === "warn" || v === "fail";
}

function normalizeState(raw: unknown): UatState {
  if (!raw || typeof raw !== "object") return { ...EMPTY_STATE };
  const o = raw as Record<string, unknown>;
  const statuses: UatState["statuses"] = {};
  const notes: UatState["notes"] = {};
  if (o.statuses && typeof o.statuses === "object") {
    for (const [id, st] of Object.entries(o.statuses as Record<string, unknown>)) {
      if (isUatStatus(st)) statuses[id] = st;
    }
  }
  if (o.notes && typeof o.notes === "object") {
    for (const [id, note] of Object.entries(o.notes as Record<string, unknown>)) {
      if (typeof note === "string") notes[id] = note;
    }
  }
  return {
    tester: typeof o.tester === "string" ? o.tester : "",
    verdict: typeof o.verdict === "string" ? o.verdict : "",
    statuses,
    notes,
  };
}

export function loadUatPersisted(): UatPersisted | null {
  try {
    const raw = localStorage.getItem(UAT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<UatPersisted>;
    const phase = parsed.phase === 2 || parsed.phase === 3 ? parsed.phase : 1;
    return { version: 1, state: normalizeState(parsed.state), phase };
  } catch {
    return null;
  }
}

export function saveUatPersisted(data: UatPersisted): void {
  try {
    localStorage.setItem(UAT_STORAGE_KEY, JSON.stringify(data));
  } catch {
    // تجاهل — مساحة ممتلئة أو وضع خاص
  }
}

export function clearUatPersisted(): void {
  try {
    localStorage.removeItem(UAT_STORAGE_KEY);
  } catch {
    // ignore
  }
}
