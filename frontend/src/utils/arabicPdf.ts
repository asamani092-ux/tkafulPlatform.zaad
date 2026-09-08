/**
 * محرّك PDF عربي قابل للتحديد (نص حقيقي، RTL، تشكيل حروف — ليس لقطة شاشة).
 * تعقيد التصدير: زمنياً O(rows·cols)، مكانياً O(rows·cols) + خط مضمّن مرة واحدة.
 */
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
// eslint-disable-next-line @typescript-eslint/no-require-imports
import reshaper from "arabic-persian-reshaper";
import bidiFactory from "bidi-js";

const bidi = bidiFactory();
const FONT_URL = "/fonts/NotoNaskhArabic-Regular.ttf";
const FONT_NAME = "NotoNaskhArabic";

let fontBase64Promise: Promise<string> | null = null;

async function loadFontBase64(): Promise<string> {
  if (!fontBase64Promise) {
    fontBase64Promise = (async () => {
      const res = await fetch(FONT_URL);
      if (!res.ok) throw new Error("تعذّر تحميل خط العربية للـ PDF");
      const buf = await res.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let binary = "";
      const chunk = 0x8000;
      for (let i = 0; i < bytes.length; i += chunk) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
      }
      return btoa(binary);
    })();
  }
  return fontBase64Promise;
}

/** تشكيل + إعادة ترتيب بصري للكتابة داخل jsPDF (محرّك LTR). */
export function shapeArabic(text: string): string {
  const raw = String(text ?? "");
  if (!raw) return "";
  const reshaped = reshaper.ArabicShaper.convertArabic(raw);
  const levels = bidi.getEmbeddingLevels(reshaped);
  return bidi.getReorderedString(reshaped, levels);
}

export interface ArabicPdfTableInput {
  fileName: string;
  title: string;
  subtitle?: string;
  summary?: Array<{ label: string; value: string | number }>;
  columns: string[];
  rows: Array<Array<string | number>>;
}

export async function downloadArabicPdf(input: ArabicPdfTableInput): Promise<void> {
  const fontB64 = await loadFontBase64();
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  doc.addFileToVFS(`${FONT_NAME}.ttf`, fontB64);
  doc.addFont(`${FONT_NAME}.ttf`, FONT_NAME, "normal");
  doc.setFont(FONT_NAME, "normal");

  const pageW = doc.internal.pageSize.getWidth();
  let y = 36;

  doc.setFontSize(16);
  doc.text(shapeArabic(input.title), pageW - 40, y, { align: "right" });
  y += 22;

  if (input.subtitle) {
    doc.setFontSize(10);
    doc.text(shapeArabic(input.subtitle), pageW - 40, y, { align: "right" });
    y += 18;
  }

  if (input.summary && input.summary.length > 0) {
    doc.setFontSize(10);
    const summaryLine = input.summary.map((s) => `${s.label}: ${s.value}`).join("   |   ");
    doc.text(shapeArabic(summaryLine), pageW - 40, y, { align: "right" });
    y += 16;
  }

  // عكس الأعمدة/الخلايا لأن الجدول يُرسم LTR بينما العرض RTL
  const head = [input.columns.map((c) => shapeArabic(c)).reverse()];
  const body = input.rows.map((row) =>
    row.map((cell) => shapeArabic(String(cell ?? "—"))).reverse(),
  );

  autoTable(doc, {
    startY: y + 6,
    head,
    body,
    styles: {
      font: FONT_NAME,
      fontStyle: "normal",
      fontSize: 9,
      halign: "right",
      valign: "middle",
      cellPadding: 4,
    },
    headStyles: {
      fontStyle: "normal",
      font: FONT_NAME,
      fillColor: [15, 118, 110],
      textColor: 255,
      halign: "right",
    },
    margin: { left: 40, right: 40 },
  });

  doc.save(input.fileName.endsWith(".pdf") ? input.fileName : `${input.fileName}.pdf`);
}
