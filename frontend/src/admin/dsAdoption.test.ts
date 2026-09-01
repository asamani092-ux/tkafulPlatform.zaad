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
      // عناصر HTML خام (حروف صغيرة) فقط — أغلفة React المعنونة تبدأ بحرف كبير.
      // يُسمح بالوسم الخام إن كان معنوناً (aria-label) أو checkbox (عبر غلاف Checkbox).
      const tagRe = /<(input|textarea|select)\b[^>]*?\/?>/gs;
      const offenders: string[] = [];
      let m: RegExpExecArray | null;
      while ((m = tagRe.exec(src)) !== null) {
        const tag = m[0];
        const labeled = /aria-label\s*=/.test(tag) || /type=["']checkbox["']/.test(tag);
        if (!labeled) offenders.push(tag.replace(/\s+/g, " ").slice(0, 80));
      }
      expect(
        offenders.length,
        `${name} يحتوي على عنصر إدخال خام غير معنون: ${offenders.join(" | ")}`,
      ).toBe(0);
    });
  }
});
