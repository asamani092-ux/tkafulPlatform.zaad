import { useState } from "react";
import Input from "../ui/Input";
import Textarea from "../ui/Textarea";
import Select from "../ui/Select";
import Checkbox from "../ui/Checkbox";
import Button from "../ui/Button";
import Badge from "../ui/Badge";
import { autoFieldKeyFromLabel } from "../../utils/autoSlug";
import { useToast } from "../../contexts/ToastContext";

export type FieldType = "text" | "textarea" | "number" | "select" | "boolean" | "date";

export interface SchemaField {
  key: string;
  label: string;
  type: FieldType;
  required: boolean;
  options?: string[];
  is_public?: boolean;
}

export const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  text: "نص",
  textarea: "نص طويل",
  number: "رقم",
  select: "قائمة اختيار",
  boolean: "نعم/لا",
  date: "تاريخ",
};

/**
 * بنّاء مخطط حقول ديناميكية مشترك (نماذج الطلبات + أنواع الكفالات).
 * التعقيد: O(n) لعدد الحقول المعروضة.
 */
export default function FieldSchemaBuilder({
  fields,
  onChange,
  allowPublicFlag = false,
}: {
  fields: SchemaField[];
  onChange: (next: SchemaField[]) => void;
  allowPublicFlag?: boolean;
}) {
  const toast = useToast();
  const [draft, setDraft] = useState<{
    label: string;
    type: FieldType;
    required: boolean;
    is_public: boolean;
  }>({ label: "", type: "text", required: false, is_public: true });
  const [optionsText, setOptionsText] = useState("");

  const addField = () => {
    if (!draft.label.trim()) {
      toast.error({ title: "التسمية مطلوبة" });
      return;
    }
    let key = autoFieldKeyFromLabel(draft.label);
    let n = 2;
    while (fields.some((f) => f.key === key)) {
      key = `${autoFieldKeyFromLabel(draft.label)}_${n}`;
      n += 1;
    }
    const options =
      draft.type === "select"
        ? optionsText.split(",").map((s) => s.trim()).filter(Boolean)
        : undefined;
    if (draft.type === "select" && (!options || options.length === 0)) {
      toast.error({ title: "أدخل خيارات القائمة مفصولة بفواصل" });
      return;
    }
    onChange([
      ...fields,
      {
        key,
        label: draft.label,
        type: draft.type,
        required: draft.required,
        options,
        is_public: draft.is_public,
      },
    ]);
    setDraft({ label: "", type: "text", required: false, is_public: true });
    setOptionsText("");
  };

  return (
    <div className="rounded-lg border border-surface-border p-3">
      <p className="mb-2 text-sm font-bold text-primary">الحقول ({fields.length})</p>
      <div className="mb-2 space-y-1">
        {fields.map((f, i) => (
          <div key={f.key} className="flex flex-wrap items-center gap-2 text-sm">
            <strong>{f.label}</strong>
            <Badge>{FIELD_TYPE_LABELS[f.type]}</Badge>
            {f.required && <Badge variant="warning">إلزامي</Badge>}
            {allowPublicFlag && f.is_public === false && <Badge variant="danger">خاص</Badge>}
            <Button
              type="button"
              variant="danger"
              size="sm"
              onClick={() => onChange(fields.filter((_, j) => j !== i))}
            >
              إزالة
            </Button>
          </div>
        ))}
        {fields.length === 0 && (
          <p className="text-xs text-brand-gray">لا حقول بعد — أضف حقلاً واحداً على الأقل.</p>
        )}
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Input
          label="تسمية الحقل (عربية)"
          value={draft.label}
          onChange={(e) => setDraft({ ...draft, label: e.target.value })}
        />
        <Select
          label="النوع"
          value={draft.type}
          onChange={(e) => setDraft({ ...draft, type: e.target.value as FieldType })}
        >
          {(Object.keys(FIELD_TYPE_LABELS) as FieldType[]).map((t) => (
            <option key={t} value={t}>
              {FIELD_TYPE_LABELS[t]}
            </option>
          ))}
        </Select>
        {draft.type === "select" && (
          <Input
            label="الخيارات (بفواصل)"
            value={optionsText}
            onChange={(e) => setOptionsText(e.target.value)}
          />
        )}
        <div className="flex items-end">
          <Checkbox
            label="إلزامي"
            checked={draft.required}
            onChange={(e) => setDraft({ ...draft, required: e.target.checked })}
          />
        </div>
        {allowPublicFlag && (
          <div className="flex items-end">
            <Checkbox
              label="ظاهر للعامة"
              checked={draft.is_public}
              onChange={(e) => setDraft({ ...draft, is_public: e.target.checked })}
            />
          </div>
        )}
        <div className="flex items-end">
          <Button type="button" variant="secondary" onClick={addField}>
            إضافة حقل
          </Button>
        </div>
      </div>
    </div>
  );
}

/** رسم حقول ديناميكية للإدخال — O(n). */
export function DynamicFieldsInput({
  fields,
  values,
  onChange,
}: {
  fields: SchemaField[];
  values: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
}) {
  const set = (key: string, value: unknown) => onChange({ ...values, [key]: value });
  return (
    <div className="space-y-3">
      {fields.map((f) => {
        const label = `${f.label}${f.required ? " *" : ""}`;
        const raw = values[f.key];
        if (f.type === "textarea") {
          return (
            <Textarea
              key={f.key}
              label={label}
              rows={2}
              value={String(raw ?? "")}
              onChange={(e) => set(f.key, e.target.value)}
              required={f.required}
            />
          );
        }
        if (f.type === "select") {
          return (
            <Select
              key={f.key}
              label={label}
              value={String(raw ?? "")}
              onChange={(e) => set(f.key, e.target.value)}
              required={f.required}
            >
              <option value="">اختر…</option>
              {(f.options || []).map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </Select>
          );
        }
        if (f.type === "boolean") {
          return (
            <Checkbox
              key={f.key}
              label={label}
              checked={Boolean(raw)}
              onChange={(e) => set(f.key, e.target.checked)}
            />
          );
        }
        return (
          <Input
            key={f.key}
            label={label}
            type={f.type === "number" ? "number" : f.type === "date" ? "date" : "text"}
            value={String(raw ?? "")}
            onChange={(e) => set(f.key, f.type === "number" ? e.target.value : e.target.value)}
            required={f.required}
          />
        );
      })}
    </div>
  );
}

/** معاينة حيّة للقراءة فقط. */
export function FieldSchemaPreview({ title, fields }: { title: string; fields: SchemaField[] }) {
  return (
    <div className="rounded-lg border border-surface-border bg-surface-muted p-3">
      <p className="mb-2 text-sm font-bold text-primary">معاينة حيّة</p>
      <div className="rounded-lg bg-surface p-3">
        <h4 className="mb-3 text-base font-bold text-primary">{title || "اسم النوع"}</h4>
        {fields.length === 0 ? (
          <p className="text-xs text-brand-gray">ستظهر الحقول هنا فور إضافتها.</p>
        ) : (
          <DynamicFieldsInput fields={fields} values={{}} onChange={() => {}} />
        )}
      </div>
    </div>
  );
}
