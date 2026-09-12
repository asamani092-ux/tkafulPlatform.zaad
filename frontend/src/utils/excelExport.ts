/**
 * تصدير Excel عربي (.xlsx) بأوراق متعددة وعرض أعمدة ملائم.
 * التعقيد: زمنياً O(sheets · rows · cols)، مكانياً O(sheets · rows · cols).
 */
import * as XLSX from "xlsx";

export interface ExcelSheet {
  /** اسم الورقة (يُقصّ إلى 31 حرفاً ويُنظَّف لقيود Excel) */
  name: string;
  /** صفوف كائنات؛ المفاتيح = رؤوس عربية */
  rows: Array<Record<string, unknown>>;
  /** ترتيب الأعمدة اختياري */
  columns?: string[];
}

function safeSheetName(name: string, used: Set<string>): string {
  let base = (name || "ورقة").replace(/[\\/?*\[\]:]/g, " ").trim() || "ورقة";
  if (base.length > 28) base = base.slice(0, 28);
  let candidate = base;
  let n = 2;
  while (used.has(candidate)) {
    const suffix = `-${n}`;
    candidate = `${base.slice(0, Math.max(1, 31 - suffix.length))}${suffix}`;
    n += 1;
  }
  used.add(candidate);
  return candidate;
}

function colWidth(rows: Array<Record<string, unknown>>, key: string): number {
  let max = String(key).length;
  for (const row of rows) {
    const len = String(row[key] ?? "").length;
    if (len > max) max = len;
  }
  return Math.min(48, Math.max(10, Math.ceil(max * 1.2) + 2));
}

/** تنزيل مصنف .xlsx بعدة أوراق. */
export function downloadExcel(fileName: string, sheets: ExcelSheet[]): void {
  if (!sheets.length) return;
  const wb = XLSX.utils.book_new();
  const used = new Set<string>();

  for (const sheet of sheets) {
    const rows = sheet.rows;
    if (rows.length === 0) {
      const empty = XLSX.utils.aoa_to_sheet([["لا بيانات"]]);
      XLSX.utils.book_append_sheet(wb, empty, safeSheetName(sheet.name, used));
      continue;
    }
    const columns = sheet.columns?.length ? sheet.columns : Object.keys(rows[0]);
    const aoa: unknown[][] = [columns];
    for (const row of rows) {
      aoa.push(columns.map((c) => row[c] ?? ""));
    }
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws["!cols"] = columns.map((c) => ({ wch: colWidth(rows, c) }));
    (ws as XLSX.WorkSheet & { "!rtl"?: boolean })["!rtl"] = true;
    XLSX.utils.book_append_sheet(wb, ws, safeSheetName(sheet.name, used));
  }

  const name = fileName.endsWith(".xlsx") ? fileName : `${fileName}.xlsx`;
  XLSX.writeFile(wb, name);
}

/** يقسّم صفوفاً إلى أوراق حسب قيمة عمود (مشروع/قسم). O(n). */
export function sheetsByColumn(
  rows: Array<Record<string, unknown>>,
  groupKey: string,
  columns?: string[],
  emptyName = "بدون تصنيف",
): ExcelSheet[] {
  const map = new Map<string, Array<Record<string, unknown>>>();
  for (const row of rows) {
    const key = String(row[groupKey] ?? "").trim() || emptyName;
    const list = map.get(key);
    if (list) list.push(row);
    else map.set(key, [row]);
  }
  return Array.from(map.entries()).map(([name, groupRows]) => ({
    name,
    rows: groupRows,
    columns,
  }));
}
