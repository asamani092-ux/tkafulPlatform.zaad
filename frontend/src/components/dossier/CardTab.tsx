import { useMemo, useState } from "react";
import Button from "../ui/Button";
import Input from "../ui/Input";
import Badge from "../ui/Badge";
import CollapsibleCard from "./CollapsibleCard";
import EditableDataTable, { type TableColumn, type HeaderGroup } from "./EditableDataTable";
import PhasesEditor from "./PhasesEditor";
import { DOSSIER_STATUS_AR, type DossierSchema, type SchemaField } from "./types";

export type CardScalars = {
  marketing_name: string;
  department: string;
  section: string;
  strategic_goal: string;
  execution_start: string;
  execution_end: string;
  location: string;
  sponsor_id: number | null;
  sponsor_name: string;
  sponsor_email: string;
  approver_id: number | null;
  approver_name: string;
  approver_email: string;
};

export type UserOption = { id: number; name: string; email: string };

type Props = {
  code: string;
  status: string;
  card: CardScalars;
  schema: DossierSchema | null;
  drafts: Record<string, Record<string, unknown>>;
  canEdit: boolean;
  savingKey: string;
  phasesHintTotal?: number;
  users?: UserOption[];
  onInviteUser?: (payload: { name: string; email: string }) => Promise<UserOption | null>;
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

export function UserPick({
  label,
  users,
  valueId,
  valueName,
  valueEmail,
  disabled,
  onPick,
  onInvite,
  emptyLabel = "— اختر مستخدماً —",
  hint,
}: {
  label: string;
  users: UserOption[];
  valueId: number | null;
  valueName: string;
  valueEmail: string;
  disabled?: boolean;
  onPick: (u: UserOption | null) => void;
  onInvite?: (payload: { name: string; email: string }) => Promise<UserOption | null>;
  emptyLabel?: string;
  hint?: string;
}) {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <div className="space-y-2 sm:col-span-1">
      <label className="block text-sm font-bold text-primary">{label}</label>
      <select
        className="input-field w-full"
        disabled={disabled}
        value={valueId ?? ""}
        onChange={(e) => {
          const id = e.target.value ? Number(e.target.value) : null;
          const hit = users.find((u) => u.id === id) || null;
          onPick(hit);
        }}
      >
        <option value="">{emptyLabel}</option>
        {users.map((u) => (
          <option key={u.id} value={u.id}>
            {(u.name || u.email) + (u.email ? ` (${u.email})` : "")}
          </option>
        ))}
      </select>
      {hint ? <p className="text-xs text-brand-gray">{hint}</p> : null}
      {(valueName || valueEmail) && (
        <p className="text-xs text-brand-gray">
          {valueName || "—"} · {valueEmail || "—"}
        </p>
      )}
      {onInvite && !disabled && (
        <div>
          {!inviteOpen ? (
            <button
              type="button"
              className="text-xs font-bold text-primary hover:underline"
              onClick={() => setInviteOpen(true)}
            >
              المستخدم غير موجود؟ أنشئ دعوة
            </button>
          ) : (
            <div className="space-y-2 rounded-lg border border-surface-border p-2">
              <Input label="الاسم" value={inviteName} onChange={(e) => setInviteName(e.target.value)} />
              <Input
                label="البريد"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  disabled={busy || !inviteName.trim() || !inviteEmail.trim()}
                  onClick={() => {
                    void (async () => {
                      setBusy(true);
                      try {
                        const created = await onInvite({
                          name: inviteName.trim(),
                          email: inviteEmail.trim(),
                        });
                        if (created) {
                          onPick(created);
                          setInviteOpen(false);
                          setInviteName("");
                          setInviteEmail("");
                        }
                      } finally {
                        setBusy(false);
                      }
                    })();
                  }}
                >
                  إرسال الدعوة
                </Button>
                <Button type="button" variant="secondary" onClick={() => setInviteOpen(false)}>
                  إلغاء
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** تبويب البطاقة: بيانات مطلوبة + جداول في بطاقات قابلة للطي. */
export default function CardTab({
  code,
  status,
  card,
  schema,
  drafts,
  canEdit,
  savingKey,
  phasesHintTotal,
  users = [],
  onInviteUser,
  onCardChange,
  onSaveCard,
  onSaveSection,
  onDraftChange,
  onOpenInfo,
}: Props) {
  const cardSections = schema?.card || [];

  const sectionMeta = useMemo(() => {
    return cardSections.map((sec) => {
      const tableField = sec.fields.find((f) => f.type === "table");
      const draftKey = `card:${sec.key}`;
      const data = drafts[draftKey] || {};
      const rows = tableField ? asRows(data[tableField.key]) : [];
      return { sec, tableField, draftKey, rows };
    });
  }, [cardSections, drafts]);

  return (
    <div className="space-y-3" dir="rtl">
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

      <CollapsibleCard title="البيانات المطلوبة" defaultOpen={false} subtitle="الاسم والإدارة والتواريخ والراعي وصاحب الاعتماد">
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
          <UserPick
            label="راعي المشروع"
            users={users}
            valueId={card.sponsor_id}
            valueName={card.sponsor_name}
            valueEmail={card.sponsor_email}
            disabled={!canEdit}
            onInvite={onInviteUser}
            onPick={(u) =>
              onCardChange({
                ...card,
                sponsor_id: u?.id ?? null,
                sponsor_name: u?.name || "",
                sponsor_email: u?.email || "",
              })
            }
          />
          <UserPick
            label="صاحب الاعتماد"
            users={users}
            valueId={card.approver_id}
            valueName={card.approver_name}
            valueEmail={card.approver_email}
            disabled={!canEdit}
            emptyLabel="— مدير النظام إن تُرك فارغاً —"
            hint="إن تُرك فارغاً يُعيَّن مدير النظام"
            onInvite={onInviteUser}
            onPick={(u) =>
              onCardChange({
                ...card,
                approver_id: u?.id ?? null,
                approver_name: u?.name || "",
                approver_email: u?.email || "",
              })
            }
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
      </CollapsibleCard>

      {sectionMeta.map(({ sec, tableField, draftKey, rows }) => {
        if (!tableField) return null;
        const { columns, headerGroups } = fieldColumns(tableField);
        return (
          <CollapsibleCard
            key={sec.key}
            title={sec.label}
            defaultOpen={false}
            subtitle={
              rows.length
                ? `${rows.length} ${sec.key === "phases" ? "مرحلة" : "صف"}`
                : sec.key === "phases"
                  ? "لا مراحل بعد"
                  : "لا صفوف بعد"
            }
            badge={
              rows.length > 0 ? (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
                  {rows.length}
                </span>
              ) : null
            }
          >
            {sec.key === "phases" ? (
              <>
                <div className="md:hidden">
                  <PhasesEditor
                    columns={columns}
                    rows={rows}
                    disabled={!canEdit}
                    onChange={(next) => onDraftChange(sec.key, { [tableField.key]: next })}
                  />
                </div>
                <div className="hidden md:block">
                  <EditableDataTable
                    label={sec.label}
                    hideTitle
                    columns={columns}
                    headerGroups={headerGroups}
                    rows={rows}
                    disabled={!canEdit}
                    primaryKey="activity_type"
                    budgetGroup="budget"
                    onChange={(next) => onDraftChange(sec.key, { [tableField.key]: next })}
                  />
                </div>
              </>
            ) : (
              <EditableDataTable
                label={sec.label}
                hideTitle
                columns={columns}
                headerGroups={headerGroups}
                rows={rows}
                disabled={!canEdit}
                onChange={(next) => onDraftChange(sec.key, { [tableField.key]: next })}
              />
            )}
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
          </CollapsibleCard>
        );
      })}
    </div>
  );
}
