/**
 * حارس مستودع: مسارات الطفرات في الإدارة لا تقلب بوابة تحميل الصفحة.
 * يسمح بـ setLoading(true) فقط داخل فرع shouldFlipPageLoading / flip.
 */
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const ROOTS = [
  path.resolve(__dirname, "../components/pages/admin"),
  path.resolve(__dirname, "../components/pages/saqya"),
];

const SETTER = /\bset(?:Loading|LoadingVols|LoadingVolunteers)\(true\)/g;

function walk(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const out: string[] = [];
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) out.push(...walk(p));
    else if (name.endsWith(".tsx") || name.endsWith(".ts")) out.push(p);
  }
  return out;
}

function ungatedSetLoadingTrue(src: string): number[] {
  const lines = src.split("\n");
  const hits: number[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (!SETTER.test(lines[i])) continue;
    SETTER.lastIndex = 0;
    // ابحث في نافذة الأسطر السابقة عن بوابة flip
    const window = lines.slice(Math.max(0, i - 8), i + 1).join("\n");
    const gated =
      /shouldFlipPageLoading\s*\(/.test(window) ||
      /\bif\s*\(\s*flip\s*\)/.test(window) ||
      /const\s+flip\s*=/.test(window);
    if (!gated) hits.push(i + 1);
  }
  return hits;
}

describe("admin no-remount guard", () => {
  it("no ungated setLoading(true) in admin or embedded saqya portals", () => {
    const files = ROOTS.flatMap(walk).filter(
      (f) =>
        !f.endsWith(".test.ts") &&
        !f.endsWith(".test.tsx") &&
        // بوابات الأدوار العامة للمتبرع/المورد/المندوب خارج نطاق لوحة الإدارة
        !/DonorPortal|SupplierPortal|RepresentativePortal/.test(f),
    );
    const violations: string[] = [];
    for (const file of files) {
      const src = fs.readFileSync(file, "utf8");
      const lines = ungatedSetLoadingTrue(src);
      for (const ln of lines) {
        violations.push(`${path.relative(process.cwd(), file)}:${ln}`);
      }
    }
    expect(violations, `ungated page-loading flips:\n${violations.join("\n")}`).toEqual([]);
  });
});
