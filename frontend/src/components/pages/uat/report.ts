/** توليد تقرير UAT بصيغة Markdown — دالة نقية قابلة للاختبار. O(S) على السيناريوهات. */
import { UAT_SECTIONS } from "./data";

export type UatStatus = "pass" | "warn" | "fail";

export interface UatState {
  tester: string;
  verdict: string;
  statuses: Record<string, UatStatus | undefined>;
  notes: Record<string, string | undefined>;
}

export const STATUS_LABELS: Record<UatStatus, string> = {
  pass: "✅ ناجح",
  warn: "⚠️ ملاحظة",
  fail: "❌ فشل",
};

export function summarize(state: UatState) {
  const all = UAT_SECTIONS.flatMap((s) => s.scenarios);
  const counts = { pass: 0, warn: 0, fail: 0, pending: 0, total: all.length };
  for (const sc of all) {
    const st = state.statuses[sc.id];
    if (st === "pass") counts.pass += 1;
    else if (st === "warn") counts.warn += 1;
    else if (st === "fail") counts.fail += 1;
    else counts.pending += 1;
  }
  return counts;
}

export function buildReport(state: UatState, now: Date = new Date()): string {
  const counts = summarize(state);
  const lines: string[] = [];
  lines.push("# تقرير تقييم القبول (UAT) — منصّة تكافل وأثر");
  lines.push("");
  lines.push(`- التاريخ: ${now.toISOString().slice(0, 16).replace("T", " ")} UTC`);
  lines.push(`- المقيّم: ${state.tester || "—"}`);
  lines.push(
    `- النتيجة: ${counts.pass} ناجح · ${counts.warn} ملاحظة · ${counts.fail} فشل · ${counts.pending} لم يُختبر (من ${counts.total})`,
  );
  lines.push(`- الحكم النهائي: ${state.verdict || "—"}`);
  lines.push("");
  for (const section of UAT_SECTIONS) {
    lines.push(`## ${section.title}`);
    lines.push("");
    lines.push("| # | السيناريو | الدور | المتوقع | التقييم | ملاحظات |");
    lines.push("|---|---|---|---|---|---|");
    for (const sc of section.scenarios) {
      const st = state.statuses[sc.id];
      const note = (state.notes[sc.id] || "").replace(/\|/g, "/").replace(/\n/g, " ");
      lines.push(
        `| ${sc.id} | ${sc.title} | ${sc.role || "—"} | ${sc.expected} | ${st ? STATUS_LABELS[st] : "—"} | ${note} |`,
      );
    }
    lines.push("");
  }
  return lines.join("\n");
}
