import Card from "../ui/Card";
import Button from "../ui/Button";
import Input from "../ui/Input";
import Badge from "../ui/Badge";
import EditableDataTable, { type TableColumn, type HeaderGroup } from "./EditableDataTable";
import { DOSSIER_STATUS_AR, type DossierSchema, type SchemaField } from "./types";

export type CardScalars = {
  marketing_name: string;
  department: string;
  section: string;
  strategic_goal: string;
  execution_start: string;
  execution_end: string;
  location: string;
  sponsor_name: string;
  sponsor_email: string;
};

type Props = {
  code: string;
  status: string;
  card: CardScalars;
  schema: DossierSchema | null;
  drafts: Record<string, Record<string, unknown>>;
  canEdit: boolean;
  savingKey: string;
  phasesHintTotal?: number;
  onCardChange: (next: CardScalars) => void;
  onSaveCard: () => void;
  onSaveSection: (key: string) => void;
  onDraftChange: (sectionKey: string, data: Record<string, unknown>) => void;
  onOpenInfo?: () => void;
};

function asRows(val: unknown): Record<string, string | number>[] {
  return Array.isArray(val) ? (val as Record<string, string | number>[]) : [];
}

function fieldColumns(f: SchemaField): { columns: TableColumn[]; headerGroups: HeaderGroup[] } {
  const columns: TableColumn[] = (f.columns || []).map((c) => ({
    key: c.key,
    label: c.label,
    type: (c as { type?: "text" | "number" | "date" }).type,
    group: (c as { group?: string }).group,
    computed: (c as { computed?: string }).computed,
    readonly: (c as { readonly?: boolean }).readonly,
  }));
  const headerGroups: HeaderGroup[] = ((f as { header_groups?: HeaderGroup[] }).header_groups || []).slice();
  return { columns, headerGroups };
}

/** تبويب البطاقة: بيانات مطلوبة + جداول المؤشرات/المراحل/المخرجات/التجارب/المخصص. */
export default function CardTab({
  code,
  status,
  card,
  schema,
  drafts,
  canEdit,
  savingKey,
  phasesHintTotal,
  onCardChange,
  onSaveCard,
  onSaveSection,
  onDraftChange,
  onOpenInfo,
}: Props) {
  const cardSections = schema?.card || [];

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge>{code}</Badge>
          <Badge variant="warning">{DOSSIER_STATUS_AR[status] || status}</Badge>
        </div>
        {onOpenInfo && (
          <Button type="button" variant="secondary" onClick={onOpenInfo}>
            صفحة المعلومات
          </Button>
        )}
      </div>

      <Card>
        <h2 className="mb-3 text-lg font-extrabold text-primary">البيانات المطلوبة</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input
            label="الاسم"
            value={card.marketing_name}
            disabled={!canEdit}
            onChange={(e) => onCardChange({ ...card, marketing_name: e.target.value })}
          />
          <Input
            label="الإدارة"
            value={card.department}
            disabled={!canEdit}
            onChange={(e) => onCardChange({ ...card, department: e.target.value })}
          />
          <Input
            label="القسم"
            value={card.section}
            disabled={!canEdit}
            onChange={(e) => onCardChange({ ...card, section: e.target.value })}
          />
          <Input
            label="الموقع"
            value={card.location}
            disabled={!canEdit}
            onChange={(e) => onCardChange({ ...card, location: e.target.value })}
          />
          <Input
            label="تاريخ بدء التنفيذ"
            type="date"
            value={card.execution_start}
            disabled={!canEdit}
            onChange={(e) => onCardChange({ ...card, execution_start: e.target.value })}
          />
          <Input
            label="تاريخ انتهاء التنفيذ"
            type="date"
            value={card.execution_end}
            disabled={!canEdit}
            onChange={(e) => onCardChange({ ...card, execution_end: e.target.value })}
          />
          <Input
            label="راعي المشروع"
            value={card.sponsor_name}
            disabled={!canEdit}
            onChange={(e) => onCardChange({ ...card, sponsor_name: e.target.value })}
          />
          <Input
            label="ايميل الراعي"
            type="email"
            value={card.sponsor_email}
            disabled={!canEdit}
            onChange={(e) => onCardChange({ ...card, sponsor_email: e.target.value })}
          />
          <label className="block text-sm sm:col-span-2">
            <span className="label-field">الهدف الاستراتيجي</span>
            <textarea
              className="input-field mt-1 w-full"
              rows={3}
              value={card.strategic_goal}
              disabled={!canEdit}
              onChange={(e) => onCardChange({ ...card, strategic_goal: e.target.value })}
            />
          </label>
        </div>
        {canEdit && (
          <div className="mt-4">
            <Button type="button" onClick={onSaveCard} disabled={savingKey === "card:scalars"}>
              حفظ البيانات المطلوبة
            </Button>
          </div>
        )}
      </Card>

      {cardSections.map((sec) => {
        const tableField = sec.fields.find((f) => f.type === "table");
        if (!tableField) return null;
        const draftKey = `card:${sec.key}`;
        const data = drafts[draftKey] || {};
        const { columns, headerGroups } = fieldColumns(tableField);
        const rows = asRows(data[tableField.key]);
        return (
          <Card key={sec.key}>
            <EditableDataTable
              label={sec.label}
              columns={columns}
              headerGroups={headerGroups}
              rows={rows}
              disabled={!canEdit}
              onChange={(next) => onDraftChange(sec.key, { [tableField.key]: next })}
            />
            {sec.key === "project_budget" && typeof phasesHintTotal === "number" && (
              <p className="mt-2 text-xs text-brand-gray">
                مجموع مخصصات المراحل (تلميح): {phasesHintTotal.toLocaleString("ar-SA")}
              </p>
            )}
            {canEdit && (
              <div className="mt-3">
                <Button
                  type="button"
                  onClick={() => onSaveSection(sec.key)}
                  disabled={savingKey === draftKey}
                >
                  حفظ {sec.label}
                </Button>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
