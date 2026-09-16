/**
 * اختبارات عارض مخطط الأقسام وشريط المراحل (منطق عرض).
 */
import { describe, expect, it } from "vitest";
import { STAGE_STATUS_AR, SECTION_STATUS_AR } from "../components/dossier/types";

describe("dossier labels", () => {
  it("covers stage statuses", () => {
    expect(STAGE_STATUS_AR.locked).toBeTruthy();
    expect(STAGE_STATUS_AR.active).toBeTruthy();
    expect(STAGE_STATUS_AR.submitted).toBeTruthy();
    expect(STAGE_STATUS_AR.approved).toBeTruthy();
  });

  it("covers section statuses", () => {
    expect(SECTION_STATUS_AR.empty).toBeTruthy();
    expect(SECTION_STATUS_AR.filled).toBeTruthy();
    expect(SECTION_STATUS_AR.returned).toBeTruthy();
  });
});
