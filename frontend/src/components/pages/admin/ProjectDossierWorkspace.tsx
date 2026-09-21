import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import AdminShell from "../../layout/AdminShell";
import Card from "../../ui/Card";
import Button from "../../ui/Button";
import Input from "../../ui/Input";
import Badge from "../../ui/Badge";
import { LoadingState, ErrorState } from "../../feedback/PageStates";
import { useToast } from "../../../contexts/ToastContext";
import { authFetch } from "../../../lib/api";
import SectionRenderer from "../../dossier/SectionRenderer";
import StageBar from "../../dossier/StageBar";
import ActivitiesPanel from "../../dossier/ActivitiesPanel";
import DossierDashboard from "../../dossier/DossierDashboard";
import ClosureComparison from "../../dossier/ClosureComparison";
import {
  DOSSIER_STATUS_AR,
  SECTION_STATUS_AR,
  type DossierSchema,
  type ProjectDossier,
  type SchemaSection,
  type StageActivity,
} from "../../dossier/types";
import { downloadDossierPdf, type ExportPayload } from "../../../utils/dossierPdf";

type Tab = "card" | "document" | "plan" | "closure" | "board";

const TABS: Array<{ id: Tab; label: string }> = [
  { id: "card", label: "البطاقة" },
  { id: "document", label: "الوثيقة" },
  { id: "plan", label: "الخطة التنفيذية" },
  { id: "closure", label: "الإغلاق" },
  { id: "board", label: "لوحة المشروع" },
];

export default function ProjectDossierWorkspace() {
  const { slug } = useParams();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>("card");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [dossier, setDossier] = useState<ProjectDossier | null>(null);
  const [schema, setSchema] = useState<DossierSchema | null>(null);
  const [activities, setActivities] = useState<StageActivity[]>([]);
  const [dash, setDash] = useState<Record<string, unknown> | null>(null);
  const [comparison, setComparison] = useState<{
    pairs: Array<{
      label: string;
      document_key: string;
      closure_key: string;
      document_status: string;
      closure_status: string;
      document_data: Record<string, unknown>;
      closure_data: Record<string, unknown>;
    }>;
    budget_lines: Array<{
      id: number;
      title: string;
      proposed: string;
      allocated: string;
      spent: string;
      remaining: string;
    }>;
  } | null>(null);
  const [projectId, setProjectId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [sectionDrafts, setSectionDrafts] = useState<Record<string, Record<string, unknown>>>({});
  const [savingKey, setSavingKey] = useState("");
  const [card, setCard] = useState({
    marketing_name: "",
    portfolio: "",
    department: "",
    section: "",
    strategic_goal: "",
    location: "",
    projects_office_name: "",
    projects_committee_name: "",
    sponsor_name: "",
    sponsor_email: "",
    manager_email: "",
    budget_association: "0",
    budget_donation: "0",
  });

  const load = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    setError(false);
    try {
      const [schemaRes, byRes, projRes] = await Promise.all([
        authFetch("/api/projectdocs/schema/"),
        authFetch(`/api/projectdocs/dossiers/by-project/${encodeURIComponent(slug)}/`),
        authFetch(`/api/platform/projects/`),
      ]);
      if (schemaRes.ok) setSchema(await schemaRes.json());

      let foundProjectId: number | null = null;
      if (projRes.ok) {
        const list = await projRes.json();
        const arr = Array.isArray(list) ? list : list.results || [];
        const hit = arr.find((p: { slug: string }) => p.slug === slug);
        if (hit) foundProjectId = hit.id;
      }
      setProjectId(foundProjectId);

      if (byRes.status === 404) {
        setDossier(null);
        return;
      }
      if (!byRes.ok) throw new Error("fail");
      const d: ProjectDossier = await byRes.json();
      setDossier(d);
      setCard({
        marketing_name: d.marketing_name || "",
        portfolio: d.portfolio || "",
        department: d.department || "",
        section: d.section || "",
        strategic_goal: d.strategic_goal || "",
        location: d.location || "",
        projects_office_name: d.projects_office_name || "",
        projects_committee_name: d.projects_committee_name || "",
        sponsor_name: d.sponsor_name || "",
        sponsor_email: d.sponsor_email || "",
        manager_email: d.manager_email || "",
        budget_association: String(d.budget_association ?? 0),
        budget_donation: String(d.budget_donation ?? 0),
      });
      const drafts: Record<string, Record<string, unknown>> = {};
      d.sections.forEach((s) => {
        drafts[`${s.kind}:${s.key}`] = { ...(s.data || {}) };
      });
      setSectionDrafts(drafts);

      const [actRes, dashRes, cmpRes] = await Promise.all([
        authFetch(`/api/projectdocs/dossiers/${d.id}/activities/`),
        authFetch(`/api/projectdocs/dossiers/${d.id}/dashboard/`),
        authFetch(`/api/projectdocs/dossiers/${d.id}/comparison/`),
      ]);
      if (actRes.ok) setActivities(await actRes.json());
      if (dashRes.ok) setDash(await dashRes.json());
      if (cmpRes.ok) setComparison(await cmpRes.json());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    void load();
  }, [load]);

  const activeStage = useMemo(
    () => dossier?.stages.find((s) => s.status === "active" || s.status === "returned" || s.status === "submitted"),
    [dossier],
  );

  const createDossier = async () => {
    if (!projectId) {
      toast.error({ title: "تعذّر تحديد المشروع" });
      return;
    }
    setCreating(true);
    try {
      const res = await authFetch("/api/projectdocs/dossiers/", {
        method: "POST",
        body: JSON.stringify({ project_id: projectId, ...card }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error({ title: data.detail || data.project || "تعذّر إنشاء الملف" });
        return;
      }
      toast.success({ title: "تم إنشاء ملف المشروع" });
      await load();
      setTab("document");
    } finally {
      setCreating(false);
    }
  };

  const saveCard = async () => {
    if (!dossier) return;
    const res = await authFetch(`/api/projectdocs/dossiers/${dossier.id}/`, {
      method: "PATCH",
      body: JSON.stringify(card),
    });
    if (!res.ok) {
      toast.error({ title: "تعذّر حفظ البطاقة" });
      return;
    }
    toast.success({ title: "حُفظت البطاقة" });
    await load();
  };

  const saveSection = async (kind: "document" | "closure", key: string) => {
    if (!dossier) return;
    const draftKey = `${kind}:${key}`;
    setSavingKey(draftKey);
    try {
      const res = await authFetch(`/api/projectdocs/dossiers/${dossier.id}/sections/${kind}/${key}/`, {
        method: "PATCH",
        body: JSON.stringify({ data: sectionDrafts[draftKey] || {} }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error({ title: data.detail || data.stage || "تعذّر الحفظ" });
        return;
      }
      toast.success({ title: "حُفظ القسم" });
      await load();
    } finally {
      setSavingKey("");
    }
  };

  const submitActiveStage = async () => {
    if (!dossier || !activeStage) return;
    const res = await authFetch(`/api/projectdocs/dossiers/${dossier.id}/stages/${activeStage.order}/submit/`, {
      method: "POST",
      body: "{}",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error({ title: data.detail || data.sponsor_email || data.status || "تعذّر الإرسال" });
      return;
    }
    toast.success({ title: "أُرسلت المرحلة للاعتماد" });
    await load();
  };

  const adminDecide = async (decision: "approved" | "returned") => {
    if (!dossier || !activeStage) return;
    const note = decision === "returned" ? window.prompt("سبب الإعادة") || "" : "";
    const res = await authFetch(`/api/projectdocs/dossiers/${dossier.id}/stages/${activeStage.order}/decide/`, {
      method: "POST",
      body: JSON.stringify({ decision, note }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error({ title: data.detail || "تعذّر القرار" });
      return;
    }
    toast.success({ title: decision === "approved" ? "اعتُمدت المرحلة" : "أُعيدت للتعديل" });
    await load();
  };

  const exportKind = async (kind: "document" | "closure") => {
    if (!dossier) return;
    const res = await authFetch(`/api/projectdocs/dossiers/${dossier.id}/export-payload/`);
    if (!res.ok) {
      toast.error({ title: "تعذّر التصدير" });
      return;
    }
    const payload = (await res.json()) as ExportPayload;
    await downloadDossierPdf(payload, kind);
    toast.success({ title: "تم تنزيل PDF" });
  };

  const sectionsFor = (kind: "document" | "closure"): Array<{ def: SchemaSection; status: string }> => {
    if (!schema || !dossier) return [];
    const defs = kind === "document" ? schema.document : schema.closure;
    return defs.map((def) => {
      const row = dossier.sections.find((s) => s.kind === kind && s.key === def.key);
      return { def, status: row?.status || "empty" };
    });
  };

  const canEditSection = (stageKey: string) => {
    if (!activeStage) return false;
    return (
      activeStage.key === stageKey &&
      (activeStage.status === "active" || activeStage.status === "returned")
    );
  };

  if (loading) {
    return (
      <AdminShell>
        <LoadingState title="جاري تحميل ملف المشروع…" />
      </AdminShell>
    );
  }
  if (error) {
    return (
      <AdminShell>
        <ErrorState title="تعذّر التحميل" message="تحقق من الصلاحيات أو أعد المحاولة." />
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2" dir="rtl">
        <div>
          <h1 className="text-2xl font-extrabold text-primary">ملف المشروع</h1>
          <p className="text-sm text-brand-gray">
            {slug}
            {dossier ? ` · ${dossier.code}` : ""}
          </p>
        </div>
        <Link to="/Admin/projects" className="text-sm font-bold text-primary hover:underline">
          ← العودة للمشاريع
        </Link>
      </div>

      {!dossier ? (
        <Card>
          <h2 className="mb-2 text-lg font-bold text-primary">لا يوجد ملف لهذا المشروع</h2>
          <p className="mb-4 text-sm text-brand-gray">
            أنشئ ملف مشروع جديد من قائمة المشاريع عبر «إنشاء ملف مشروع» (اسم + راعي)، أو أنشئ ملفاً هنا إن كان المشروع موجوداً مسبقاً.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              label="الاسم التسويقي"
              value={card.marketing_name}
              onChange={(e) => setCard({ ...card, marketing_name: e.target.value })}
            />
            <Input
              label="بريد الراعي"
              value={card.sponsor_email}
              onChange={(e) => setCard({ ...card, sponsor_email: e.target.value })}
            />
            <Input
              label="اسم الراعي"
              value={card.sponsor_name}
              onChange={(e) => setCard({ ...card, sponsor_name: e.target.value })}
            />
            <Input
              label="بريد المسؤول"
              value={card.manager_email}
              onChange={(e) => setCard({ ...card, manager_email: e.target.value })}
            />
          </div>
          <div className="mt-4">
            <Button type="button" onClick={() => void createDossier()} disabled={creating}>
              إنشاء ملف على المشروع الحالي
            </Button>
          </div>
        </Card>
      ) : (
        <>
          <div className="mb-4">
            <StageBar stages={dossier.stages} currentKey={dossier.current_stage} />
            {activeStage?.return_note && (
              <p className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">
                سبب الإعادة: {activeStage.return_note}
              </p>
            )}
          </div>

          <div className="mb-4 flex flex-wrap gap-2">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`rounded-lg px-3 py-2 text-sm font-bold ${
                  tab === t.id ? "bg-primary text-white" : "border border-surface-border bg-surface text-primary"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === "card" && (
            <Card>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <Badge>{dossier.code}</Badge>
                <Badge variant="warning">{DOSSIER_STATUS_AR[dossier.status] || dossier.status}</Badge>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {(
                  [
                    ["marketing_name", "الاسم التسويقي"],
                    ["portfolio", "المحفظة"],
                    ["department", "الإدارة"],
                    ["section", "القسم"],
                    ["location", "الموقع"],
                    ["sponsor_name", "اسم الراعي"],
                    ["sponsor_email", "بريد الراعي"],
                    ["manager_email", "بريد المسؤول"],
                    ["projects_office_name", "مكتب المشاريع (عرض)"],
                    ["projects_committee_name", "لجنة المشاريع (عرض)"],
                    ["budget_association", "مخصص الجمعية"],
                    ["budget_donation", "مخصص التبرعات"],
                  ] as const
                ).map(([k, label]) => (
                  <Input
                    key={k}
                    label={label}
                    value={card[k]}
                    onChange={(e) => setCard({ ...card, [k]: e.target.value })}
                  />
                ))}
                <label className="block text-sm sm:col-span-2">
                  <span className="mb-1 block font-bold text-primary">الهدف الاستراتيجي</span>
                  <textarea
                    className="w-full rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm"
                    rows={3}
                    value={card.strategic_goal}
                    onChange={(e) => setCard({ ...card, strategic_goal: e.target.value })}
                  />
                </label>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button type="button" onClick={() => void saveCard()}>
                  حفظ البطاقة
                </Button>
                {activeStage && (activeStage.status === "active" || activeStage.status === "returned") && (
                  <Button type="button" onClick={() => void submitActiveStage()}>
                    إرسال المرحلة للاعتماد
                  </Button>
                )}
                {activeStage?.status === "submitted" && (
                  <>
                    <Button type="button" onClick={() => void adminDecide("approved")}>
                      اعتماد (مشرف)
                    </Button>
                    <Button type="button" variant="secondary" onClick={() => void adminDecide("returned")}>
                      إعادة للتعديل
                    </Button>
                  </>
                )}
              </div>
            </Card>
          )}

          {(tab === "document" || tab === "closure") && (
            <div className="space-y-3">
              {tab === "document" && (
                <p className="text-sm text-brand-gray">
                  أقسام المرحلة النشطة فقط قابلة للتعبئة. الإغلاق له تبويب منفصل بعد فتح مرحلته.
                </p>
              )}
              {tab === "closure" && comparison && (
                <Card>
                  <h3 className="mb-2 font-bold text-primary">مقارنة الوثيقة والإغلاق</h3>
                  <ClosureComparison pairs={comparison.pairs} budgetLines={comparison.budget_lines} />
                </Card>
              )}
              <div className="flex justify-end">
                <Button type="button" variant="secondary" onClick={() => void exportKind(tab === "document" ? "document" : "closure")}>
                  تصدير PDF
                </Button>
              </div>
              {sectionsFor(tab === "document" ? "document" : "closure").map(({ def, status }) => {
                const kind = tab === "document" ? "document" : "closure";
                const draftKey = `${kind}:${def.key}`;
                const editable = canEditSection(def.stage);
                const dimmed = kind === "document" && activeStage && def.stage !== activeStage.key && activeStage.key !== "close";
                return (
                  <Card key={def.key}>
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h3 className="font-bold text-primary">{def.label}</h3>
                        <p className="text-xs text-brand-gray">
                          المرحلة: {def.stage} · {SECTION_STATUS_AR[status] || status}
                          {dimmed ? " · خارج المرحلة الحالية" : ""}
                        </p>
                      </div>
                      {editable && (
                        <Button
                          type="button"
                          onClick={() => void saveSection(kind, def.key)}
                          disabled={savingKey === draftKey}
                        >
                          حفظ القسم
                        </Button>
                      )}
                    </div>
                    <SectionRenderer
                      section={def}
                      data={sectionDrafts[draftKey] || {}}
                      disabled={!editable}
                      onChange={(next) => setSectionDrafts((p) => ({ ...p, [draftKey]: next }))}
                    />
                  </Card>
                );
              })}
            </div>
          )}

          {tab === "plan" && (
            <Card>
              <ActivitiesPanel
                stages={dossier.stages}
                activities={activities}
                canEdit={!!activeStage && (activeStage.status === "active" || activeStage.status === "returned")}
                onCreate={async (payload) => {
                  const res = await authFetch(`/api/projectdocs/dossiers/${dossier.id}/activities/`, {
                    method: "POST",
                    body: JSON.stringify(payload),
                  });
                  if (!res.ok) {
                    toast.error({ title: "تعذّر إضافة النشاط" });
                    return;
                  }
                  toast.success({ title: "أُضيف النشاط" });
                  await load();
                }}
                onComplete={async (id, payload) => {
                  const fd = new FormData();
                  fd.append("lessons", payload.lessons);
                  fd.append("notes", payload.notes);
                  fd.append("evidence_url", payload.evidence_url);
                  fd.append("evidence_title", payload.evidence_title);
                  if (payload.file) fd.append("file", payload.file);
                  const res = await authFetch(
                    `/api/projectdocs/dossiers/${dossier.id}/activities/${id}/complete/`,
                    { method: "POST", body: fd },
                  );
                  const data = await res.json().catch(() => ({}));
                  if (!res.ok) {
                    toast.error({
                      title: data.evidence || data.lessons || data.detail || "تعذّر الإتمام",
                    });
                    return;
                  }
                  toast.success({ title: "تم إتمام النشاط مع الشاهد" });
                  await load();
                }}
                onDelete={async (id) => {
                  const res = await authFetch(`/api/projectdocs/dossiers/${dossier.id}/activities/${id}/`, {
                    method: "DELETE",
                  });
                  if (!res.ok && res.status !== 204) {
                    toast.error({ title: "تعذّر الحذف" });
                    return;
                  }
                  await load();
                }}
              />
            </Card>
          )}

          {tab === "board" && (
            <Card>
              <DossierDashboard
                data={dash as never}
                canAllocate
                canSpend={!!activeStage && (activeStage.status === "active" || activeStage.status === "returned")}
                onAllocate={async (lineId, amount) => {
                  const res = await authFetch(
                    `/api/projectdocs/dossiers/${dossier.id}/budget-lines/${lineId}/allocate/`,
                    { method: "POST", body: JSON.stringify({ amount }) },
                  );
                  if (!res.ok) {
                    const data = await res.json().catch(() => ({}));
                    toast.error({ title: data.detail || data.amount || "تعذّر المخصص" });
                    return;
                  }
                  toast.success({ title: "حُدّث المخصص" });
                  await load();
                }}
                onSpend={async (lineId, amount) => {
                  const res = await authFetch(
                    `/api/projectdocs/dossiers/${dossier.id}/budget-lines/${lineId}/spend/`,
                    { method: "POST", body: JSON.stringify({ amount }) },
                  );
                  if (!res.ok) {
                    const data = await res.json().catch(() => ({}));
                    toast.error({ title: data.detail || data.amount || "تعذّر الخصم" });
                    return;
                  }
                  toast.success({ title: "تم الخصم من البند" });
                  await load();
                }}
              />
            </Card>
          )}
        </>
      )}
    </AdminShell>
  );
}
