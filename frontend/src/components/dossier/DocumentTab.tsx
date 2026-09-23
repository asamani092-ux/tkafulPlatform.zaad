import { useState } from "react";
import Button from "../ui/Button";
import CollapsibleCard from "./CollapsibleCard";
import EditableDataTable, { type TableColumn } from "./EditableDataTable";
import SectionRenderer from "./SectionRenderer";
import { SECTION_STATUS_AR, type SchemaSection } from "./types";

type TeamCandidate = {
  user_id: number;
  name: string;
  job_title: string;
  phone: string;
  email: string;
};

type Props = {
  sections: Array<{ def: SchemaSection; status: string }>;
  drafts: Record<string, Record<string, unknown>>;
  canEdit: boolean;
  canApprove: boolean;
  savingKey: string;
  decidingKey: string;
  fixedPhases: Array<{ key: string; label: string }>;
  teamCandidates: TeamCandidate[];
  onDraftChange: (sectionKey: string, data: Record<string, unknown>) => void;
  onSave: (sectionKey: string) => void;
  onDecide: (sectionKey: string, decision: "approved" | "returned") => void;
};

type Row = Record<string, string | number | boolean>;

function asRows(val: unknown): Row[] {
  return Array.isArray(val) ? (val as Row[]) : [];
}

function fieldColumns(sec: SchemaSection, tableKey: string): TableColumn[] {
  const f = sec.fields.find((x) => x.key === tableKey);
  return (f?.columns || [])
    .filter((c) => !(c as { hidden?: boolean }).hidden)
    .map((c) => ({
      key: c.key,
      label: c.label,
      type: (c.type as TableColumn["type"]) || "text",
      computed: c.computed,
      readonly: c.readonly,
      group: c.group,
    }));
}

/** مصفوفة الأثر المنطقي: صفّان ثابتان × 4 أعمدة. */
function LogicalImpactMatrix({
  data,
  disabled,
  onChange,
}: {
  data: Record<string, unknown>;
  disabled?: boolean;
  onChange: (next: Record<string, unknown>) => void;
}) {
  const rows = asRows(data.rows);
  const ensured =
    rows.length >= 2
      ? rows
      : [
          { row_key: "impact", label: "الأثر", description: "", indicators: "", means: "", assumptions: "" },
          {
            row_key: "returns",
            label: "العوائد والغايات",
            description: "",
            indicators: "",
            means: "",
            assumptions: "",
          },
        ];
  const cols = [
    { key: "description", label: "الوصف" },
    { key: "indicators", label: "المؤشرات" },
    { key: "means", label: "وسائل التحقق" },
    { key: "assumptions", label: "الافتراضات" },
  ];
  const setCell = (i: number, key: string, v: string) => {
    const next = ensured.map((r, idx) => (idx === i ? { ...r, [key]: v } : r));
    onChange({ rows: next });
  };
  return (
    <div className="overflow-x-auto rounded-xl border border-surface-border" dir="rtl">
      <table className="w-full min-w-[720px] border-collapse text-sm">
        <thead>
          <tr className="bg-surface-muted/40">
            <th className="border-b border-surface-border px-2 py-2 text-right font-bold text-primary">الصف</th>
            {cols.map((c) => (
              <th key={c.key} className="border-b border-surface-border px-2 py-2 text-right font-bold text-primary">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ensured.slice(0, 2).map((row, i) => (
            <tr key={String(row.row_key || i)}>
              <td className="border-b border-surface-border bg-primary/[0.06] px-2 py-2 font-extrabold text-primary">
                {String(row.label || "")}
              </td>
              {cols.map((c) => (
                <td key={c.key} className="border-b border-surface-border px-1 py-1">
                  <textarea
                    className="input-field w-full !py-1 text-sm"
                    rows={2}
                    disabled={disabled}
                    value={String(row[c.key] ?? "")}
                    onChange={(e) => setCell(i, c.key, e.target.value)}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** مراحل ثابتة + أنشطة كحقول دائرية. */
function FixedPhasesActivities({
  data,
  disabled,
  fixedPhases,
  onChange,
}: {
  data: Record<string, unknown>;
  disabled?: boolean;
  fixedPhases: Array<{ key: string; label: string }>;
  onChange: (next: Record<string, unknown>) => void;
}) {
  const raw = asRows(data.phases) as Array<{ key?: string; label?: string; activities?: string[] }>;
  const byKey = Object.fromEntries(raw.filter((p) => p.key).map((p) => [String(p.key), p]));
  const phases = fixedPhases.map((p) => ({
    key: p.key,
    label: p.label,
    activities: Array.isArray(byKey[p.key]?.activities) ? byKey[p.key].activities! : [],
  }));
  const [drafts, setDrafts] = useState(phases.map(() => ""));

  const commit = (next: typeof phases) => onChange({ phases: next });

  const addActivity = (i: number) => {
    const text = drafts[i]?.trim() || "";
    if (!text) return;
    const next = phases.map((p, idx) =>
      idx === i ? { ...p, activities: [...p.activities, text] } : p,
    );
    commit(next);
    setDrafts((d) => {
      const copy = [...d];
      while (copy.length < phases.length) copy.push("");
      copy[i] = "";
      return copy;
    });
  };

  const removeActivity = (i: number, j: number) => {
    const next = phases.map((p, idx) =>
      idx === i ? { ...p, activities: p.activities.filter((_, k) => k !== j) } : p,
    );
    commit(next);
  };

  return (
    <div className="space-y-3" dir="rtl">
      {phases.map((phase, i) => (
        <CollapsibleCard
          key={phase.key}
          title={phase.label}
          defaultOpen={false}
          subtitle={
            phase.activities.length ? `${phase.activities.length} نشاط` : "لا أنشطة بعد"
          }
          badge={
            phase.activities.length > 0 ? (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
                {phase.activities.length}
              </span>
            ) : null
          }
        >
          <div className="mb-2 flex flex-wrap gap-2">
            {phase.activities.map((act, j) => (
              <span
                key={`${phase.key}-${j}`}
                className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-bold text-primary"
              >
                {act}
                {!disabled && (
                  <button type="button" className="text-red-700" onClick={() => removeActivity(i, j)} aria-label="حذف">
                    ×
                  </button>
                )}
              </span>
            ))}
            {!phase.activities.length && <span className="text-xs text-brand-gray">لا أنشطة بعد</span>}
          </div>
          {!disabled && (
            <div className="flex flex-wrap items-center gap-2">
              <input
                className="input-field max-w-xs flex-1 text-sm"
                placeholder="نشاط جديد"
                value={drafts[i] || ""}
                onChange={(e) =>
                  setDrafts((d) => {
                    const copy = [...d];
                    while (copy.length < phases.length) copy.push("");
                    copy[i] = e.target.value;
                    return copy;
                  })
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addActivity(i);
                  }
                }}
              />
              <Button type="button" variant="secondary" onClick={() => addActivity(i)}>
                +
              </Button>
            </div>
          )}
        </CollapsibleCard>
      ))}
    </div>
  );
}

/** تطلعات — صفوف أفقية. */
function AspirationsHorizontal({
  data,
  disabled,
  fields,
  onChange,
}: {
  data: Record<string, unknown>;
  disabled?: boolean;
  fields: SchemaSection["fields"];
  onChange: (next: Record<string, unknown>) => void;
}) {
  return (
    <div className="space-y-2" dir="rtl">
      {fields.map((f) => (
        <div key={f.key} className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[180px_1fr]">
          <span className="text-sm font-bold text-primary">{f.label}</span>
          <input
            className="input-field w-full text-sm"
            disabled={disabled}
            value={String(data[f.key] ?? "")}
            onChange={(e) => onChange({ ...data, [f.key]: e.target.value })}
          />
        </div>
      ))}
    </div>
  );
}

function DocumentBudgetPanel({
  sec,
  data,
  disabled,
  fixedPhases,
  onChange,
}: {
  sec: SchemaSection;
  data: Record<string, unknown>;
  disabled?: boolean;
  fixedPhases: Array<{ key: string; label: string }>;
  onChange: (next: Record<string, unknown>) => void;
}) {
  const alloc = asRows(data.card_allocation);
  const lines: Row[] = asRows(data.lines).map((r) => {
    const q = Number(r.quantity) || 0;
    const p = Number(r.unit_price) || 0;
    return { ...r, line_total: q * p };
  });
  const grand = lines.reduce((a, r) => a + (Number(r.line_total) || 0), 0);
  const phaseOptions = Object.fromEntries(fixedPhases.map((p) => [p.key, p.label]));

  const setLines = (next: Row[]) => {
    const withTotal = next.map((r) => {
      const q = Number(r.quantity) || 0;
      const p = Number(r.unit_price) || 0;
      return { ...r, line_total: q * p };
    });
    onChange({
      ...data,
      card_allocation: alloc,
      lines: withTotal,
      lines_grand_total: withTotal.reduce((a, r) => a + (Number(r.line_total) || 0), 0),
    });
  };

  const columns: TableColumn[] = [
    { key: "phase_key", label: "المرحلة", type: "text" },
    { key: "activity", label: "النشاط" },
    { key: "statement", label: "البيان" },
    { key: "quantity", label: "الكمية", type: "number" },
    { key: "unit_price", label: "السعر للوحدة", type: "number" },
    { key: "line_total", label: "الاجمالي", type: "number", readonly: true, computed: "product:quantity,unit_price" },
  ];

  return (
    <div className="space-y-4" dir="rtl">
      <div>
        <h4 className="mb-2 text-sm font-extrabold text-primary">المخصص من البطاقة (عرض فقط)</h4>
        <EditableDataTable
          label="المخصص"
          hideTitle
          columns={fieldColumns(sec, "card_allocation")}
          rows={alloc as Record<string, string | number>[]}
          disabled
          onChange={() => undefined}
        />
      </div>
      <div>
        <h4 className="mb-2 text-sm font-extrabold text-primary">تكلفة المشروع</h4>
        <div className="mb-2 text-xs text-brand-gray">
          المرحلة: {fixedPhases.map((p) => p.label).join(" · ")}
        </div>
        {/* جدول مبسّط مع قائمة مرحلة */}
        <div className="space-y-2">
          {!disabled && (
            <Button
              type="button"
              variant="secondary"
              onClick={() =>
                setLines([
                  ...lines,
                  {
                    phase_key: fixedPhases[0]?.key || "define",
                    activity: "",
                    statement: "",
                    quantity: 0,
                    unit_price: 0,
                    line_total: 0,
                  },
                ])
              }
            >
              إضافة صف
            </Button>
          )}
          <div className="overflow-x-auto rounded-xl border border-surface-border">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead>
                <tr>
                  {columns.map((c) => (
                    <th key={c.key} className="border-b border-surface-border px-2 py-2 text-right font-bold text-primary">
                      {c.label}
                    </th>
                  ))}
                  {!disabled && <th className="border-b border-surface-border" />}
                </tr>
              </thead>
              <tbody>
                {lines.map((row, i) => (
                  <tr key={i}>
                    <td className="border-b border-surface-border px-1 py-1">
                      <select
                        className="input-field w-full !py-1 text-sm"
                        disabled={disabled}
                        value={String(row.phase_key || "")}
                        onChange={(e) => {
                          const next = lines.map((r, idx) =>
                            idx === i ? { ...r, phase_key: e.target.value } : r,
                          );
                          setLines(next);
                        }}
                      >
                        {fixedPhases.map((p) => (
                          <option key={p.key} value={p.key}>
                            {p.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    {(["activity", "statement", "quantity", "unit_price", "line_total"] as const).map((k) => (
                      <td key={k} className="border-b border-surface-border px-1 py-1">
                        <input
                          className="input-field w-full !py-1 text-sm"
                          type={k === "activity" || k === "statement" ? "text" : "number"}
                          disabled={disabled || k === "line_total"}
                          readOnly={k === "line_total"}
                          value={
                            k === "activity" || k === "statement"
                              ? String(row[k] ?? "")
                              : Number(row[k]) || 0
                          }
                          onChange={(e) => {
                            const raw =
                              k === "quantity" || k === "unit_price"
                                ? e.target.value === ""
                                  ? 0
                                  : Number(e.target.value)
                                : e.target.value;
                            const next = lines.map((r, idx) => (idx === i ? { ...r, [k]: raw } : r));
                            setLines(next);
                          }}
                        />
                      </td>
                    ))}
                    {!disabled && (
                      <td className="border-b border-surface-border px-1 text-center">
                        <button
                          type="button"
                          className="text-xs font-bold text-red-700"
                          onClick={() => setLines(lines.filter((_, idx) => idx !== i))}
                        >
                          حذف
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-sm font-extrabold text-primary">
            اجمالي الأصناف: {grand.toLocaleString("ar-SA")}
            <span className="ms-2 text-xs font-normal text-brand-gray">
              ({Object.values(phaseOptions).length} مراحل ثابتة)
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}

function TeamPickerTable({
  data,
  disabled,
  candidates,
  onChange,
}: {
  data: Record<string, unknown>;
  disabled?: boolean;
  candidates: TeamCandidate[];
  onChange: (next: Record<string, unknown>) => void;
}) {
  const rows = asRows(data.rows);
  const addMember = (c: TeamCandidate) => {
    if (rows.some((r) => Number(r.user_id) === c.user_id)) return;
    onChange({
      rows: [
        ...rows,
        {
          name: c.name,
          job_title: c.job_title,
          phone: c.phone,
          email: c.email,
          main_tasks: "",
          user_id: String(c.user_id),
        },
      ],
    });
  };
  return (
    <div className="space-y-3" dir="rtl">
      {!disabled && (
        <label className="block text-sm">
          <span className="label-field">إضافة عضو من المنصة</span>
          <select
            className="input-field mt-1 w-full"
            defaultValue=""
            onChange={(e) => {
              const id = Number(e.target.value);
              const c = candidates.find((x) => x.user_id === id);
              if (c) addMember(c);
              e.target.value = "";
            }}
          >
            <option value="">اختر عضواً…</option>
            {candidates.map((c) => (
              <option key={c.user_id} value={c.user_id}>
                {c.name} — {c.email || "بدون بريد"}
              </option>
            ))}
          </select>
        </label>
      )}
      <EditableDataTable
        label="الفريق"
        hideTitle
        columns={[
          { key: "name", label: "الاسم" },
          { key: "job_title", label: "الوظيفة" },
          { key: "phone", label: "رقم التواصل" },
          { key: "email", label: "الايميل" },
          { key: "main_tasks", label: "المهام الرئيسية" },
        ]}
        rows={rows.map(({ user_id: _u, ...rest }) => rest) as Record<string, string | number>[]}
        disabled={disabled}
        onChange={(next) => {
          // أعد user_id من الصفوف السابقة بالمطابقة على البريد/الاسم
          const merged = next.map((r, i) => ({
            ...r,
            user_id: rows[i]?.user_id || "",
          }));
          onChange({ rows: merged });
        }}
      />
    </div>
  );
}

function SimilarWithBeneficiaries({
  sec,
  data,
  disabled,
  lockRows,
  onChange,
}: {
  sec: SchemaSection;
  data: Record<string, unknown>;
  disabled?: boolean;
  lockRows?: boolean;
  onChange: (next: Record<string, unknown>) => void;
}) {
  const rows = asRows(data.rows);
  return (
    <div className="space-y-3" dir="rtl">
      <EditableDataTable
        label={sec.label}
        hideTitle
        columns={fieldColumns(sec, "rows")}
        rows={rows as Record<string, string | number>[]}
        disabled={disabled}
        onChange={(next) => {
          // احفظ أعلام القفل للصفوف القديمة
          const merged = next.map((r, i) => {
            const prev = rows[i];
            if (prev && (prev._locked || prev._source === "card")) {
              return { ...r, _locked: true, _source: "card" };
            }
            return r;
          });
          // إن قُلّص الجدول، لا تسمح بحذف المقفول من الواجهة البسيطة — الأب يتولى الدمج
          onChange({ ...data, rows: lockRows ? merged : next });
        }}
      />
      <div className="grid grid-cols-2 gap-0 overflow-hidden rounded-xl border border-surface-border sm:grid-cols-4">
        <div className="bg-surface-muted/40 px-3 py-2 text-xs font-bold text-primary">الفئة المستهدفة</div>
        <div className="border-r border-surface-border px-2 py-1 sm:col-span-1">
          <input
            className="input-field w-full !py-1 text-sm"
            disabled={disabled}
            value={String(data.target_group ?? "")}
            onChange={(e) => onChange({ ...data, target_group: e.target.value })}
          />
        </div>
        <div className="bg-surface-muted/40 px-3 py-2 text-xs font-bold text-primary">عدد المستفيدين</div>
        <div className="border-r border-surface-border px-2 py-1">
          <input
            className="input-field w-full !py-1 text-sm"
            type="number"
            disabled={disabled}
            value={Number(data.beneficiaries_count) || 0}
            onChange={(e) => onChange({ ...data, beneficiaries_count: Number(e.target.value) || 0 })}
          />
        </div>
      </div>
    </div>
  );
}

/** تبويب الوثيقة — 12 بطاقة مع اعتماد لكل بطاقة. */
export default function DocumentTab({
  sections,
  drafts,
  canEdit,
  canApprove,
  savingKey,
  decidingKey,
  fixedPhases,
  teamCandidates,
  onDraftChange,
  onSave,
  onDecide,
}: Props) {
  return (
    <div className="space-y-3" dir="rtl">
      <p className="text-sm text-brand-gray">
        أقسام وثيقة المشروع — اعتماد كل بطاقة من المدير؛ اعتماد التبويب بعد اكتمال البطاقات.
      </p>
      {sections.map(({ def, status }) => {
        const draftKey = `document:${def.key}`;
        const data = drafts[draftKey] || {};
        const approved = status === "approved";
        const editable = canEdit && !approved;
        const ui = def.ui || "default";
        const statusLabel = SECTION_STATUS_AR[status] || status;
        const rowCount = Array.isArray(data.rows)
          ? data.rows.length
          : Array.isArray(data.phases)
            ? data.phases.length
            : Array.isArray(data.lines)
              ? data.lines.length
              : 0;

        return (
          <CollapsibleCard
            key={def.key}
            title={def.label}
            defaultOpen={false}
            subtitle={rowCount > 0 ? `${statusLabel} · ${rowCount} عنصر` : statusLabel}
            badge={
              <span className="flex flex-wrap items-center gap-1">
                {def.from_card ? (
                  <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-bold text-sky-800">
                    من البطاقة
                  </span>
                ) : null}
                {rowCount > 0 ? (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
                    {rowCount}
                  </span>
                ) : null}
              </span>
            }
          >
            {ui === "logical_matrix" && (
              <LogicalImpactMatrix data={data} disabled={!editable} onChange={(n) => onDraftChange(def.key, n)} />
            )}
            {ui === "fixed_phases_activities" && (
              <FixedPhasesActivities
                data={data}
                disabled={!editable}
                fixedPhases={fixedPhases}
                onChange={(n) => onDraftChange(def.key, n)}
              />
            )}
            {ui === "aspirations_horizontal" && (
              <AspirationsHorizontal
                data={data}
                disabled={!editable}
                fields={def.fields}
                onChange={(n) => onDraftChange(def.key, n)}
              />
            )}
            {ui === "document_budget" && (
              <DocumentBudgetPanel
                sec={def}
                data={data}
                disabled={!editable}
                fixedPhases={fixedPhases}
                onChange={(n) => onDraftChange(def.key, n)}
              />
            )}
            {ui === "team_picker" && (
              <TeamPickerTable
                data={data}
                disabled={!editable}
                candidates={teamCandidates}
                onChange={(n) => onDraftChange(def.key, n)}
              />
            )}
            {ui === "similar_with_beneficiaries" && (
              <SimilarWithBeneficiaries
                sec={def}
                data={data}
                disabled={!editable}
                onChange={(n) => onDraftChange(def.key, n)}
              />
            )}
            {(ui === "table" || ui === "card_basics" || ui === "default") && (
              <>
                {ui === "card_basics" || def.fields.every((f) => f.type !== "table") ? (
                  <SectionRenderer
                    section={def}
                    data={data}
                    disabled={!editable}
                    onChange={(n) => onDraftChange(def.key, n)}
                  />
                ) : (
                  def.fields
                    .filter((f) => f.type === "table")
                    .map((f) => (
                      <EditableDataTable
                        key={f.key}
                        label={f.label}
                        hideTitle
                        columns={fieldColumns(def, f.key)}
                        rows={asRows(data[f.key]) as Record<string, string | number>[]}
                        disabled={!editable}
                        onChange={(next) => onDraftChange(def.key, { ...data, [f.key]: next })}
                      />
                    ))
                )}
              </>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-2">
              {editable && (
                <Button type="button" onClick={() => onSave(def.key)} disabled={savingKey === draftKey}>
                  حفظ {def.label}
                </Button>
              )}
              {canApprove && status !== "approved" && (
                <Button
                  type="button"
                  onClick={() => onDecide(def.key, "approved")}
                  disabled={decidingKey === def.key || status === "empty"}
                >
                  اعتماد
                </Button>
              )}
              {canApprove && status === "approved" && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => onDecide(def.key, "returned")}
                  disabled={decidingKey === def.key}
                >
                  إعادة للتعديل
                </Button>
              )}
            </div>
          </CollapsibleCard>
        );
      })}
    </div>
  );
}
