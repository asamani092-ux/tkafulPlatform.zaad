import { useEffect, useMemo, useState } from "react";
import Input from "../ui/Input";
import Select from "../ui/Select";
import Switch from "../ui/Switch";
import { authFetch } from "../../lib/api";
// authFetch: طلب مصادق مع تجديد الجلسة

export type FieldType = "bool" | "int" | "number" | "str" | "latlng";

export interface SchemaField {
  type: FieldType;
  label: string;
  hint?: string;
  min?: number;
  max?: number;
  choices?: Array<{ value: string; label: string }>;
}

export type ToolSchema = Record<string, Record<string, SchemaField>>;

let cachedSchema: ToolSchema | null = null;
let schemaPromise: Promise<ToolSchema> | null = null;

/** جلب مخطّط إعدادات الأدوات من الخادم (مصدر الحقيقة). يُخزَّن في الذاكرة. */
export function fetchToolConfigSchema(): Promise<ToolSchema> {
  if (cachedSchema) return Promise.resolve(cachedSchema);
  if (!schemaPromise) {
    schemaPromise = authFetch("/api/platform/tool-config-schema/")
      .then((r) => {
        if (!r.ok) throw new Error("schema");
        return r.json();
      })
      .then((data: ToolSchema) => {
        cachedSchema = data;
        return data;
      })
      .catch((err) => {
        schemaPromise = null;
        throw err;
      });
  }
  return schemaPromise;
}

/** للاختبارات — إعادة ضبط الذاكرة المؤقتة. */
export function __resetToolSchemaCache() {
  cachedSchema = null;
  schemaPromise = null;
}

interface Props {
  toolKey: string;
  value: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
  schema?: ToolSchema | null;
}

/**
 * نموذج إعدادات أداة مُولَّد من TOOL_CONFIG_SCHEMA عبر الواجهة.
 * لا JSON خام — حقول معنونة حسب النوع.
 */
export default function ToolConfigFields({ toolKey, value, onChange, schema: schemaProp }: Props) {
  const [schema, setSchema] = useState<ToolSchema | null>(schemaProp ?? cachedSchema);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (schemaProp) {
      setSchema(schemaProp);
      return;
    }
    let cancelled = false;
    fetchToolConfigSchema()
      .then((s) => {
        if (!cancelled) setSchema(s);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [schemaProp]);

  const fields = useMemo(() => schema?.[toolKey] ?? {}, [schema, toolKey]);

  if (loadError) {
    return <p className="text-sm text-danger">تعذّر تحميل مخطّط إعدادات الأداة.</p>;
  }
  if (!schema) {
    return <p className="text-sm text-brand-gray">جاري تحميل الإعدادات…</p>;
  }
  const entries = Object.entries(fields);
  if (entries.length === 0) {
    return <p className="text-sm text-brand-gray">لا إعدادات لهذه الأداة.</p>;
  }

  const setKey = (key: string, v: unknown) => {
    onChange({ ...value, [key]: v });
  };

  return (
    <div className="space-y-3">
      {entries.map(([key, meta]) => {
        const current = value[key];
        if (meta.type === "bool") {
          return (
            <Switch
              key={key}
              label={meta.label}
              hint={meta.hint}
              checked={Boolean(current)}
              onChange={(checked) => setKey(key, checked)}
            />
          );
        }
        if (meta.type === "latlng") {
          const pair = Array.isArray(current) ? (current as number[]) : [24.7, 46.7];
          return (
            <div key={key} className="grid grid-cols-2 gap-2">
              <Input
                label={`${meta.label} — العرض`}
                type="number"
                step="any"
                dir="ltr"
                value={String(pair[0] ?? "")}
                onChange={(e) => setKey(key, [Number(e.target.value), Number(pair[1] ?? 0)])}
                hint={meta.hint}
              />
              <Input
                label={`${meta.label} — الطول`}
                type="number"
                step="any"
                dir="ltr"
                value={String(pair[1] ?? "")}
                onChange={(e) => setKey(key, [Number(pair[0] ?? 0), Number(e.target.value)])}
              />
            </div>
          );
        }
        if (meta.choices && meta.choices.length > 0) {
          return (
            <Select
              key={key}
              label={meta.label}
              value={typeof current === "string" ? current : ""}
              onChange={(e) => setKey(key, e.target.value)}
            >
              <option value="">— اختر —</option>
              {meta.choices.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </Select>
          );
        }
        return (
          <Input
            key={key}
            label={meta.label}
            hint={meta.hint}
            type="number"
            dir="ltr"
            min={meta.min}
            max={meta.max}
            value={current === undefined || current === null ? "" : String(current)}
            onChange={(e) => {
              const n = e.target.value === "" ? undefined : Number(e.target.value);
              setKey(key, n);
            }}
          />
        );
      })}
    </div>
  );
}
