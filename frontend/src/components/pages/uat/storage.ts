/** حفظ حالة نموذج UAT في localStorage — O(k) زمن/مكان حيث k عدد الإدخالات. */
import { UAT_ID_MIGRATION } from "./data";
import type { UatState } from "./report";

export const UAT_STORAGE_KEY = "takaful_uat_state";

export interface UatPersisted {
  version: 2;
  state: UatState;
  phase: 1 | 2 | 3;
}

const EMPTY_STATE: UatState = { tester: "", verdict: "", statuses: {}, notes: {} };

function isUatStatus(v: unknown): v is "pass" | "warn" | "fail" {
  return v === "pass" || v === "warn" || v === "fail";
}

/** يطبّق خريطة الهجرة مرة واحدة على مفاتيح السجل — دون قفزات متسلسلة. O(k). */
export function migrateIdRecord<T>(record: Record<string, T | undefined>): Record<string, T | undefined> {
  const out: Record<string, T | undefined> = {};
  for (const [id, val] of Object.entries(record)) {
    if (val === undefined) continue;
    const next = UAT_ID_MIGRATION[id] ?? id;
    if (out[next] === undefined) out[next] = val;
  }
  return out;
}

function normalizeState(raw: unknown, migrateIds: boolean): UatState {
  if (!raw || typeof raw !== "object") return { ...EMPTY_STATE };
  const o = raw as Record<string, unknown>;
  let statuses: UatState["statuses"] = {};
  let notes: UatState["notes"] = {};
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
  if (migrateIds) {
    statuses = migrateIdRecord(statuses);
    notes = migrateIdRecord(notes);
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
    const parsed = JSON.parse(raw) as Partial<UatPersisted> & { version?: number };
    const phase = parsed.phase === 2 || parsed.phase === 3 ? parsed.phase : 1;
    const needsMigration = parsed.version !== 2;
    const state = normalizeState(parsed.state, needsMigration);
    const result: UatPersisted = { version: 2, state, phase };
    if (needsMigration) saveUatPersisted(result);
    return result;
  } catch {
    return null;
  }
}

export function saveUatPersisted(data: UatPersisted): void {
  try {
    localStorage.setItem(UAT_STORAGE_KEY, JSON.stringify({ ...data, version: 2 }));
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
