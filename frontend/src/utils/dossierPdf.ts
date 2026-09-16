/**
 * تصدير PDF لوثيقة/إغلاق ملف المشروع بهوية الجمعية.
 * يعيد استخدام html2pdf عبر arabicPdf.downloadArabicPdf عند الجداول،
 * مع مستند أقسام حر للهوية الرسمية.
 */
import html2pdf from "html2pdf.js";
import type { DossierSchema, SchemaSection } from "../components/dossier/types";

export type ExportPayload = {
  code: string;
  project_name: string;
  marketing_name: string;
  sponsor_name: string;
  projects_office_name: string;
  projects_committee_name: string;
  document: Array<{ key: string; status: string; data: Record<string, unknown> }>;
  closure: Array<{ key: string; status: string; data: Record<string, unknown> }>;
  schema: DossierSchema;
};

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function brandPrimary(): string {
  if (typeof window === "undefined") return "#8b1538";
  return getComputedStyle(document.documentElement).getPropertyValue("--brand-primary").trim() || "#8b1538";
}

function renderValue(val: unknown): string {
  if (val === null || val === undefined || val === "") return "—";
  if (Array.isArray(val)) {
    if (!val.length) return "—";
    return `<ul style="margin:0;padding-inline-start:18px">${val
      .map((row) => {
        if (typeof row !== "object" || !row) return `<li>${esc(String(row))}</li>`;
        return `<li>${esc(Object.values(row as Record<string, unknown>).map(String).join(" · "))}</li>`;
      })
      .join("")}</ul>`;
  }
  return esc(String(val));
}

function sectionHtml(section: SchemaSection, data: Record<string, unknown>): string {
  const fields = section.fields
    .map(
      (f) =>
        `<div style="margin-bottom:10px">
          <div style="font-size:12px;font-weight:700;color:#8b1538">${esc(f.label)}</div>
          <div style="font-size:12px;color:#333;margin-top:2px">${renderValue(data[f.key])}</div>
        </div>`,
    )
    .join("");
  return `<section style="margin-bottom:22px;page-break-inside:avoid">
    <h2 style="font-size:16px;margin:0 0 10px;padding-bottom:6px;border-bottom:2px solid #8b1538;color:#8b1538">${esc(section.label)}</h2>
    ${fields}
  </section>`;
}

export async function downloadDossierPdf(
  payload: ExportPayload,
  kind: "document" | "closure",
): Promise<void> {
  const primary = brandPrimary();
  const schemaSecs = kind === "document" ? payload.schema.document : payload.schema.closure;
  const rows = kind === "document" ? payload.document : payload.closure;
  const byKey = Object.fromEntries(rows.map((r) => [r.key, r.data]));
  const title = kind === "document" ? "وثيقة المشروع" : "وثيقة إغلاق المشروع";

  const root = document.createElement("div");
  root.setAttribute("dir", "rtl");
  root.style.cssText =
    "position:fixed;left:-10000px;top:0;width:900px;background:#fff;color:#1f1f1f;font-family:Tajawal,Tahoma,Arial,sans-serif;padding:28px 32px;box-sizing:border-box";

  const body = schemaSecs.map((s) => sectionHtml(s, byKey[s.key] || {})).join("");
  root.innerHTML = `
    <header style="display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid ${primary};padding-bottom:12px;margin-bottom:18px">
      <div>
        <div style="font-size:20px;font-weight:800;color:${primary}">تكافل وأثر</div>
        <div style="font-size:12px;color:#706f6f">${esc(title)}</div>
      </div>
      <div style="text-align:left;font-size:12px;color:#706f6f">
        <div>${esc(payload.code)}</div>
        <div>${esc(payload.project_name)}</div>
      </div>
    </header>
    <p style="font-size:13px;margin:0 0 16px;color:#444">
      الاسم التسويقي: ${esc(payload.marketing_name || "—")} ·
      الراعي: ${esc(payload.sponsor_name || "—")} ·
      مكتب المشاريع: ${esc(payload.projects_office_name || "—")} ·
      لجنة المشاريع: ${esc(payload.projects_committee_name || "—")}
    </p>
    ${body}
  `;
  document.body.appendChild(root);
  try {
    await html2pdf()
      .set({
        margin: [10, 10, 10, 10],
        filename: `${payload.code}-${kind}.pdf`,
        image: { type: "jpeg", quality: 0.95 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      })
      .from(root)
      .save();
  } finally {
    root.remove();
  }
}
