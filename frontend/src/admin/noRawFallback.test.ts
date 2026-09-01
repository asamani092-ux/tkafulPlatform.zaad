import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { labelAr, ROLE_AR, SERVICE_STATUS_AR } from "../i18n/labels";

/**
 * حارس: لا تُعرض أكواد الحالة/الدور/المفتاح الإنجليزية الخام في واجهة الإدارة.
 * - labelAr لا يُرجع المفتاح عند الغياب.
 * - مسح ثابت لأنماط || status / || role / JSON config textarea في صفحات الإدارة.
 */

const BASE = join(__dirname, "..", "components");
const SCAN_DIRS = [
  join(BASE, "pages", "admin"),
  join(BASE, "pages", "saqya"),
];

function tsxFiles(dir: string): string[] {
  return readdirSync(dir)
    .filter((f) => f.endsWith(".tsx"))
    .map((f) => join(dir, f))
    .filter((p) => statSync(p).isFile());
}

describe("labelAr لا يُسرّب المفتاح الخام", () => {
  it("يعيد الافتراضي الآمن عند غياب المفتاح", () => {
    expect(labelAr(ROLE_AR, "not_a_role")).toBe("غير معروف");
    expect(labelAr(SERVICE_STATUS_AR, "WEIRD")).toBe("غير معروف");
    expect(labelAr(ROLE_AR, null)).toBe("—");
  });

  it("يعيد التسمية العربية عند الوجود", () => {
    expect(labelAr(ROLE_AR, "admin")).toBe("مشرف عام");
    expect(labelAr(SERVICE_STATUS_AR, "PENDING")).toBe("قيد المراجعة");
  });
});

describe("حارس عدم عرض البيانات الخام في الإدارة", () => {
  const files = SCAN_DIRS.flatMap(tsxFiles);

  it("يوجد ملفات للفحص", () => {
    expect(files.length).toBeGreaterThan(5);
  });

  for (const file of files) {
    const src = readFileSync(file, "utf8");
    const name = file.split("/").pop()!;

    it(`${name}: لا JSON خام لإعدادات الأدوات`, () => {
      const offenders: string[] = [];
      if (/إعداد[^\n]{0,40}JSON/.test(src)) offenders.push("label mentions JSON");
      if (/JSON\.stringify\([^\)]*config/.test(src) && /Textarea|textarea/.test(src)) {
        offenders.push("JSON.stringify config into textarea");
      }
      if (/TOOL_CONFIG_KEYS/.test(src)) offenders.push("TOOL_CONFIG_KEYS hint dump");
      expect(offenders, offenders.join(" | ")).toEqual([]);
    });

    it(`${name}: لا fallback يعرض كود الحالة/الدور خامًا`, () => {
      // نستبعد مقارنات مثل (o.status === "a" || o.status === "b")
      const patterns = [
        /STATUS[A-Z_]*\[[^\]]+\]\s*\|\|\s*[a-zA-Z.]*(status|role|action)\b(?!\s*[=!])/,
        /\|\|\s*(detail|s|r|o|a|m)\.(status|role)\b(?!\s*[=!])/,
        /\|\|\s*(status|role|action)\s*[;}\),\]]/,
        /SUB_STATUS\[[^\]]+\]\s*\|\|\s*[a-zA-Z0-9_.]/,
        /statusLabel\[[^\]]+\]\s*\|\|\s*[a-zA-Z0-9_.]/,
        /\[[^\]]+\]\s*\|\|\s*key\b/,
        /\?\?\s*(status|role|action|key)\b/,
      ];
      const hits = patterns.flatMap((re) => {
        const m = src.match(re);
        return m ? [m[0]] : [];
      });
      expect(hits, hits.join(" | ")).toEqual([]);
    });

    it(`${name}: لا حقل slug مطلوب من المستخدم في النماذج`, () => {
      if (!/(PlatformProjects|ProjectTypesAdmin|RequestFormsAdmin)\.tsx$/.test(name)) {
        return;
      }
      const requiredSlug = /label=["'][^"']*slug[^"']*["'][^>]*required/i.test(src)
        || /label=["'][^"']*رابط مختصر[^"']*["'][^>]*required/.test(src)
        || /label=["'][^"']*المعرّف \(slug\)[^"']*["'][^>]*required/.test(src);
      expect(requiredSlug, "slug still required in form").toBe(false);
    });
  }

  it("لا يفتح رابط الكفالات الإداري في تبويب/غلاف سقيا منفصل", () => {
    const pp = readFileSync(join(BASE, "pages", "admin", "PlatformProjects.tsx"), "utf8");
    expect(pp).not.toMatch(/target="_blank"[^>]*sponsorships|sponsorships[^>]*target="_blank"/);
    expect(pp).toMatch(/Admin\/projects\/\$\{[^}]+}\/sponsorships/);
  });
});
