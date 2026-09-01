/**
 * تنزيل CSV آمن للعربية (BOM UTF-8). O(n·m) — n صفوف، m أعمدة.
 * يُستخدم عبر التقارير وتصدير الجداول.
 */
export function downloadCsv(filename: string, rows: Array<Record<string, unknown>>, columns?: string[]): void {
  if (rows.length === 0) return;
  const headers = columns && columns.length > 0 ? columns : Object.keys(rows[0]);
  const escape = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const body = rows.map((r) => headers.map((h) => escape(r[h])).join(",")).join("\n");
  const csv = "\uFEFF" + headers.join(",") + "\n" + body;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
