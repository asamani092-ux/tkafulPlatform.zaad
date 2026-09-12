/**
 * تصدير PDF عبر DOM عربي RTL مع شعار وهوية المنصة.
 * التعقيد: زمنياً O(rows·cols) لبناء الجدول + رسم اللقطة، مكانياً O(rows·cols).
 */
import html2pdf from "html2pdf.js";

export interface ArabicPdfTableInput {
  fileName: string;
  title: string;
  subtitle?: string;
  summary?: Array<{ label: string; value: string | number }>;
  columns: string[];
  rows: Array<Array<string | number>>;
  /** اختياري — شعار المنصة (افتراضي /logo.png) */
  logoUrl?: string;
  /** اختياري — اسم المنصة */
  platformName?: string;
}

/** يبقى مُصدَّراً للتوافق؛ مسار DOM لا يحتاج تشكيل حروف. */
export function shapeArabic(text: string): string {
  return String(text ?? "");
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function brandPrimary(): string {
  if (typeof window === "undefined") return "#8b1538";
  const v = getComputedStyle(document.documentElement).getPropertyValue("--brand-primary").trim();
  return v || "#8b1538";
}

function buildReportElement(input: ArabicPdfTableInput): HTMLElement {
  const primary = brandPrimary();
  const logo = input.logoUrl?.trim() || "/logo.png";
  const platform = input.platformName?.trim() || "تكافل وأثر";
  const root = document.createElement("div");
  root.setAttribute("dir", "rtl");
  root.style.cssText = [
    "position:fixed",
    "left:-10000px",
    "top:0",
    "width:1100px",
    "background:#fff",
    "color:#1f1f1f",
    "font-family:Tajawal,Tahoma,Arial,sans-serif",
    "padding:28px 32px",
    "box-sizing:border-box",
  ].join(";");

  const summaryHtml = (input.summary || [])
    .map(
      (s) =>
        `<div style="border:1px solid #e8e8e8;border-radius:8px;padding:10px 12px;text-align:center;min-width:120px">
          <div style="font-size:18px;font-weight:800;color:${primary}">${esc(String(s.value))}</div>
          <div style="font-size:11px;color:#706f6f;margin-top:4px">${esc(s.label)}</div>
        </div>`,
    )
    .join("");

  const head = input.columns
    .map(
      (c) =>
        `<th style="padding:8px 10px;border-bottom:2px solid ${primary};font-size:12px;color:${primary};text-align:right">${esc(c)}</th>`,
    )
    .join("");
  const body = input.rows
    .map((row) => {
      const cells = row
        .map(
          (cell) =>
            `<td style="padding:7px 10px;border-bottom:1px solid #eee;font-size:12px;text-align:right">${esc(String(cell ?? "—"))}</td>`,
        )
        .join("");
      return `<tr>${cells}</tr>`;
    })
    .join("");

  root.innerHTML = `
    <header style="display:flex;align-items:center;justify-content:space-between;gap:16px;border-bottom:3px solid ${primary};padding-bottom:14px;margin-bottom:18px">
      <div style="display:flex;align-items:center;gap:12px">
        <img src="${esc(logo)}" alt="" style="height:48px;width:auto;object-fit:contain" />
        <div>
          <div style="font-size:18px;font-weight:800;color:${primary}">${esc(platform)}</div>
          <div style="font-size:11px;color:#706f6f">تقرير منصّة — تصدير رسمي</div>
        </div>
      </div>
      <div style="font-size:11px;color:#706f6f">${esc(new Date().toLocaleString("ar-SA"))}</div>
    </header>
    <h1 style="margin:0 0 8px;font-size:22px;color:${primary}">${esc(input.title)}</h1>
    ${input.subtitle ? `<p style="margin:0 0 14px;font-size:13px;color:#706f6f">${esc(input.subtitle)}</p>` : ""}
    ${summaryHtml ? `<div style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:16px">${summaryHtml}</div>` : ""}
    <table style="width:100%;border-collapse:collapse">
      <thead><tr>${head}</tr></thead>
      <tbody>${body || `<tr><td colspan="${Math.max(input.columns.length, 1)}" style="padding:12px;text-align:center;color:#706f6f">لا صفوف</td></tr>`}</tbody>
    </table>
    <footer style="margin-top:18px;padding-top:10px;border-top:1px solid #e8e8e8;font-size:10px;color:#706f6f;text-align:center">
      ${esc(platform)} — مستند مولَّد تلقائياً من واجهة الإدارة
    </footer>
  `;
  return root;
}

export async function downloadArabicPdf(input: ArabicPdfTableInput): Promise<void> {
  const el = buildReportElement(input);
  document.body.appendChild(el);
  const img = el.querySelector("img");
  if (img && !img.complete) {
    await Promise.race([
      new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
      }),
      new Promise<void>((resolve) => setTimeout(resolve, 800)),
    ]);
  }
  try {
    const name = input.fileName.endsWith(".pdf") ? input.fileName : `${input.fileName}.pdf`;
    await html2pdf()
      .set({
        margin: [10, 10, 10, 10],
        filename: name,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff" },
        jsPDF: { unit: "mm", format: "a4", orientation: "landscape" },
      })
      .from(el)
      .save();
  } finally {
    el.remove();
  }
}
