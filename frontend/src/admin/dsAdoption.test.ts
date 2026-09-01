import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * حارس تبنّي نظام التصميم (المرحلة 1):
 * لا يجوز وجود عنصر إدخال خام غير معنون في صفحات الإدارة.
 * كل حقل يمرّ عبر أغلفة ui/ التي تُلزم بتسمية عربية مرتبطة.
 * O(F·L) — F ملفات الإدارة، L أسطر كل ملف.
 */

const ADMIN_DIR = join(__dirname, "..", "components", "pages", "admin");

function tsxFiles(dir: string): string[] {
  return readdirSync(dir)
    .filter((f) => f.endsWith(".tsx"))
    .map((f) => join(dir, f))
    .filter((p) => statSync(p).isFile());
}

describe("تبنّي نظام التصميم في الإدارة", () => {
  const files = tsxFiles(ADMIN_DIR);

  it("يوجد ملفات إدارة للفحص", () => {
    expect(files.length).toBeGreaterThan(5);
  });

  for (const file of files) {
    const src = readFileSync(file, "utf8");
    const name = file.split("/").pop();

    it(`${name}: لا حقول إدخال خام غير معنونة`, () => {
      // عناصر HTML خام (حروف صغيرة) فقط — أغلفة React المعنونة تبدأ بحرف كبير
      const rawInput = /<input\b(?![^>]*type=["']checkbox["'])/.test(src);
      const rawTextarea = /<textarea\b/.test(src);
      const rawSelect = /<select\b/.test(src);
      expect(
        rawInput || rawTextarea || rawSelect,
        `${name} يحتوي على عنصر إدخال خام؛ استخدم أغلفة ui/ المعنونة (Input/Textarea/Select/Checkbox)`,
      ).toBe(false);
    });
  }
});
