import { describe, expect, it } from "vitest";
import { UAT_SECTIONS, UAT_TRIAL_PHASES, sectionsForPhase } from "./data";
import { buildReport, summarize, type UatState } from "./report";

const total = UAT_SECTIONS.flatMap((s) => s.scenarios).length;

describe("UAT report generation", () => {
  it("summarizes statuses with pending remainder", () => {
    const state: UatState = {
      tester: "م", verdict: "قبول",
      statuses: { "1.1": "pass", "1.2": "warn", "2.1": "fail" },
      notes: {},
    };
    const c = summarize(state);
    expect(c).toEqual({ pass: 1, warn: 1, fail: 1, pending: total - 3, total });
  });

  it("builds a markdown report with all scenarios and escaped notes", () => {
    const state: UatState = {
      tester: "المقيّم",
      verdict: "قبول بملاحظات",
      statuses: { "1.1": "pass" },
      notes: { "1.1": "ملاحظة | بسطر\nجديد" },
    };
    const report = buildReport(state, new Date("2026-08-01T12:00:00Z"));
    expect(report).toContain("# تقرير تقييم القبول");
    expect(report).toContain("المقيّم: المقيّم");
    expect(report).toContain("الحكم النهائي: قبول بملاحظات");
    expect(report).toContain("✅ ناجح");
    expect(report).toContain("ملاحظة / بسطر جديد"); // لا يكسر جدول Markdown
    expect(report).toContain("المرحلة 1 — الموقع العام والدخول");
    expect(report).toContain("المرحلة 2 — بوابة المتطوّع ولوحة الإدارة");
    expect(report).toContain("المرحلة 3 — أدوات التشغيل والجودة");
    for (const section of UAT_SECTIONS) {
      for (const sc of section.scenarios) {
        expect(report).toContain(`| ${sc.id} |`);
      }
    }
  });

  it("splits tools into three trial phases without dropping scenarios", () => {
    const assigned = UAT_TRIAL_PHASES.flatMap((p) => sectionsForPhase(p.id));
    expect(assigned).toHaveLength(UAT_SECTIONS.length);
    expect(new Set(UAT_SECTIONS.map((s) => s.trialPhase))).toEqual(new Set([1, 2, 3]));
  });
});
