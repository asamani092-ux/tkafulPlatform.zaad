import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import AdminShell from "../../layout/AdminShell";
import Card from "../../ui/Card";
import Button from "../../ui/Button";
import Input from "../../ui/Input";
import { LoadingState, ErrorState } from "../../feedback/PageStates";
import { useToast } from "../../../contexts/ToastContext";
import { authFetch } from "../../../lib/api";
import SectionRenderer from "../../dossier/SectionRenderer";
import StageBar from "../../dossier/StageBar";
import ActivitiesPanel from "../../dossier/ActivitiesPanel";
import DossierDashboard from "../../dossier/DossierDashboard";
import ClosureComparison from "../../dossier/ClosureComparison";
import CardTab, { type CardScalars } from "../../dossier/CardTab";
import DocumentTab from "../../dossier/DocumentTab";
import DossierInfoPage, { type InfoPagePayload } from "../../dossier/DossierInfoPage";
import {
  SECTION_STATUS_AR,
  type DossierSchema,
  type ProjectDossier,
  type SchemaSection,
  type StageActivity,
} from "../../dossier/types";
import { downloadDossierPdf, type ExportPayload } from "../../../utils/dossierPdf";
import { shouldFlipPageLoading, type AdminLoadMode } from "../../../admin/loadMode";

type Tab = "card" | "document" | "plan" | "closure" | "board" | "info";

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
  const [infoPage, setInfoPage] = useState<InfoPagePayload | null>(null);
  const [teamCandidates, setTeamCandidates] = useState<
    Array<{ user_id: number; name: string; job_title: string; phone: string; email: string }>
  >([]);
  const [decidingKey, setDecidingKey] = useState("");
  const [card, setCard] = useState<CardScalars>({
    marketing_name: "",
    department: "",
    section: "",
    strategic_goal: "",
    execution_start: "",
    execution_end: "",
    location: "",
    sponsor_name: "",
    sponsor_email: "",
  });

  const absorbDossier = useCallback((d: ProjectDossier) => {
    setDossier(d);
    setCard({
      marketing_name: d.marketing_name || "",
      department: d.department || "",
      section: d.section || "",
      strategic_goal: d.strategic_goal || "",
      execution_start: d.execution_start || "",
      execution_end: d.execution_end || "",
      location: d.location || "",
      sponsor_name: d.sponsor_name || "",
      sponsor_email: d.sponsor_email || "",
    });
    const drafts: Record<string, Record<string, unknown>> = {};
    d.sections.forEach((s) => {
      drafts[`${s.kind}:${s.key}`] = { ...(s.data || {}) };
    });
    setSectionDrafts(drafts);
  }, []);

  const load = useCallback(async (mode: AdminLoadMode = "initial") => {
    if (!slug) return;
    if (shouldFlipPageLoading(mode)) {
      setLoading(true);
      setError(false);
    }
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
      absorbDossier(d);

      const [actRes, dashRes, cmpRes, infoRes, teamRes] = await Promise.all([
        authFetch(`/api/projectdocs/dossiers/${d.id}/activities/`),
        authFetch(`/api/projectdocs/dossiers/${d.id}/dashboard/`),
        authFetch(`/api/projectdocs/dossiers/${d.id}/comparison/`),
        authFetch(`/api/projectdocs/dossiers/${d.id}/info-page/`),
        authFetch(`/api/projectdocs/dossiers/${d.id}/team-candidates/`),
      ]);
      if (teamRes.ok) {
        const tj = await teamRes.json();
        setTeamCandidates(Array.isArray(tj.results) ? tj.results : []);
      } else {
        setTeamCandidates([]);
      }
      if (actRes.ok) setActivities(await actRes.json());
      if (dashRes.ok) setDash(await dashRes.json());
      if (cmpRes.ok) setComparison(await cmpRes.json());
      if (infoRes.ok) setInfoPage(await infoRes.json());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [slug, absorbDossier]);

  useEffect(() => {
    void load("initial");
  }, [load]);

  const workspaces = dossier?.workspaces || [];
  const activeWorkspace = useMemo(
    () => workspaces.find((s) => s.status === "active" || s.status === "returned" || s.status === "submitted"),
    [workspaces],
  );
  const currentWs = useMemo(
    () => workspaces.find((w) => w.key === tab) || activeWorkspace || workspaces[0],
    [workspaces, tab, activeWorkspace],
  );
  const wsOpen = (key: Tab) => {
    const w = workspaces.find((x) => x.key === key);
    if (!w) return dossier?.bypass_workspace_gates || key === "card";
    return w.status !== "locked" || !!dossier?.bypass_workspace_gates;
  };

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
      await load("silent");
      setTab("card");
    } finally {
      setCreating(false);
    }
  };

  const saveCard = async () => {
    if (!dossier) return;
    setSavingKey("card:scalars");
    try {
      const res = await authFetch(`/api/projectdocs/dossiers/${dossier.id}/`, {
        method: "PATCH",
        body: JSON.stringify({
          ...card,
          execution_start: card.execution_start || null,
          execution_end: card.execution_end || null,
        }),
      });
      const data: ProjectDossier = await res.json();
      if (!res.ok) {
        toast.error({ title: "تعذّر حفظ البطاقة" });
        return;
      }
      absorbDossier(data);
      toast.success({ title: "حُفظت البيانات المطلوبة" });
    } finally {
      setSavingKey("");
    }
  };

  const saveSection = async (kind: "card" | "document" | "closure", key: string) => {
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
        toast.error({ title: data.detail || data.stage || data.key || "تعذّر الحفظ" });
        return;
      }
      toast.success({ title: "حُفظ القسم" });
      const rows = [
        ...(data.section ? [data.section] : data.kind && data.key ? [data] : []),
        ...(Array.isArray(data.synced_document) ? data.synced_document : []),
      ];
      if (rows.length) {
        setDossier((prev) => {
          if (!prev) return prev;
          const sections = [...prev.sections];
          for (const row of rows) {
            const i = sections.findIndex((s) => s.kind === row.kind && s.key === row.key);
            if (i >= 0) sections[i] = { ...sections[i], ...row };
            else sections.push(row);
          }
          return { ...prev, sections };
        });
        setSectionDrafts((prev) => {
          const next = { ...prev };
          for (const row of rows) next[`${row.kind}:${row.key}`] = { ...(row.data || {}) };
          return next;
        });
      }
    } finally {
      setSavingKey("");
    }
  };

  const submitActiveWorkspace = async () => {
    if (!dossier || !currentWs || !currentWs.needs_approval) return;
    const res = await authFetch(`/api/projectdocs/dossiers/${dossier.id}/workspaces/${currentWs.key}/submit/`, {
      method: "POST",
      body: "{}",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error({ title: data.detail || data.sponsor_email || data.status || data.workspace || "تعذّر الإرسال" });
      return;
    }
    toast.success({ title: "أُرسل التبويب للاعتماد" });
    await load("silent");
  };

  const applyWorkspaces = (rows: Array<{ key: string; status: string }>) => {
    setDossier((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        workspaces: (prev.workspaces || []).map((w) => {
          const hit = rows.find((x) => x.key === w.key);
          return hit ? { ...w, status: hit.status } : w;
        }),
      };
    });
  };

  const adminDecideWorkspace = async (decision: "approved" | "returned" | "revoke") => {
    if (!dossier || !currentWs) return;
    const note = decision === "returned" ? window.prompt("سبب الإعادة") || "" : "";
    const res = await authFetch(`/api/projectdocs/dossiers/${dossier.id}/workspaces/${currentWs.key}/decide/`, {
      method: "POST",
      body: JSON.stringify({ decision, note }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error({ title: data.detail || data.sections || data.status || "تعذّر القرار" });
      return;
    }
    if (Array.isArray(data.workspaces)) applyWorkspaces(data.workspaces);
    toast.success({
      title: decision === "approved" ? "اعتُمد التبويب" : decision === "revoke" ? "أُزيل الاعتماد" : "أُعيد للتعديل",
    });
  };

  const decideDocumentSection = async (key: string, decision: "approved" | "revoke") => {
    if (!dossier) return;
    setDecidingKey(key);
    try {
      const res = await authFetch(`/api/projectdocs/dossiers/${dossier.id}/sections/document/${key}/decide/`, {
        method: "POST",
        body: JSON.stringify({ decision, note: "" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error({ title: data.detail || data.status || data.sections || "تعذّر اعتماد البطاقة" });
        return;
      }
      if (data.section) {
        setDossier((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            sections: prev.sections.map((s) =>
              s.kind === "document" && s.key === key ? { ...s, ...data.section } : s,
            ),
          };
        });
      }
      if (Array.isArray(data.workspaces)) applyWorkspaces(data.workspaces);
      toast.success({ title: decision === "approved" ? "اعتُمدت البطاقة" : "أُزيل الاعتماد" });
    } finally {
      setDecidingKey("");
    }
  };

  const decidePlanPhase = async (key: string, decision: "approved" | "revoke") => {
    if (!dossier) return;
    const res = await authFetch(`/api/projectdocs/dossiers/${dossier.id}/sections/plan/${key}/decide/`, {
      method: "POST",
      body: JSON.stringify({ decision, note: "" }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error({ title: data.detail || data.status || data.sections || "تعذّر اعتماد المرحلة" });
      return;
    }
    if (data.section) {
      setDossier((prev) => {
        if (!prev) return prev;
        const exists = prev.sections.some((s) => s.kind === "plan" && s.key === key);
        const sections = exists
          ? prev.sections.map((s) => (s.kind === "plan" && s.key === key ? { ...s, ...data.section } : s))
          : [...prev.sections, data.section];
        return { ...prev, sections };
      });
    }
    if (Array.isArray(data.workspaces)) applyWorkspaces(data.workspaces);
    toast.success({ title: decision === "approved" ? "اعتُمدت المرحلة" : "أُزيل الاعتماد" });
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

  /** تصفح/تعديل: مفتوح للمشرف ومدير الإدارة حتى على المقفلة. الإرسال فقط لـ active/returned. */
  const canEditWorkspace = (key: Tab) => {
    if (key === "info") return false;
    if (!wsOpen(key)) return false;
    const w = workspaces.find((x) => x.key === key);
    if (!w) return key === "card";
    if (key === "card") return true;
    if (dossier?.bypass_workspace_gates) return true;
    return w.status === "active" || w.status === "returned";
  };

  const canSubmitWorkspace = (key: Tab) => {
    const w = workspaces.find((x) => x.key === key);
    if (!w || !w.needs_approval) return false;
    return w.status === "active" || w.status === "returned";
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
              label="الاسم"
              value={card.marketing_name}
              onChange={(e) => setCard({ ...card, marketing_name: e.target.value })}
            />
            <Input
              label="ايميل الراعي"
              value={card.sponsor_email}
              onChange={(e) => setCard({ ...card, sponsor_email: e.target.value })}
            />
            <Input
              label="راعي المشروع"
              value={card.sponsor_name}
              onChange={(e) => setCard({ ...card, sponsor_name: e.target.value })}
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
            <StageBar
              workspaces={workspaces}
              currentKey={tab}
              bypassLocked={!!dossier.bypass_workspace_gates}
              onSelect={(key) => {
                if (wsOpen(key as Tab)) setTab(key as Tab);
              }}
            />
            {currentWs?.return_note && (
              <p className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">
                سبب الإعادة: {currentWs.return_note}
              </p>
            )}
            {(canSubmitWorkspace(tab) ||
              (dossier.bypass_workspace_gates && currentWs && currentWs.key !== "info" && currentWs.status !== "locked")) && (
              <div className="mt-3 flex flex-wrap gap-2">
                {canSubmitWorkspace(tab) && (
                  <Button type="button" onClick={() => void submitActiveWorkspace()}>
                    إرسال التبويب للاعتماد
                  </Button>
                )}
                {dossier.bypass_workspace_gates && currentWs && currentWs.status !== "locked" && currentWs.status !== "approved" && (
                  <Button type="button" onClick={() => void adminDecideWorkspace("approved")}>
                    اعتماد التبويب
                  </Button>
                )}
                {dossier.bypass_workspace_gates && currentWs?.status === "approved" && (
                  <Button type="button" variant="secondary" onClick={() => void adminDecideWorkspace("revoke")}>
                    إزالة الاعتماد
                  </Button>
                )}
              </div>
            )}
          </div>

          {tab === "info" && infoPage && (
            <DossierInfoPage data={infoPage} onBack={() => setTab("card")} />
          )}

          {tab === "card" && (
            <CardTab
              code={dossier.code}
              status={dossier.status}
              card={card}
              schema={schema}
              drafts={sectionDrafts}
              canEdit={canEditWorkspace("card")}
              savingKey={savingKey}
              phasesHintTotal={(() => {
                const rows = (sectionDrafts["card:phases"]?.rows as Array<Record<string, number>>) || [];
                return rows.reduce((acc, r) => acc + (Number(r.budget_total) || 0), 0);
              })()}
              onCardChange={setCard}
              onSaveCard={() => void saveCard()}
              onSaveSection={(key) => void saveSection("card", key)}
              onDraftChange={(sectionKey, data) =>
                setSectionDrafts((p) => ({ ...p, [`card:${sectionKey}`]: data }))
              }
              onOpenInfo={() => setTab("info")}
            />
          )}

          {(tab === "document" || tab === "closure") && (
            <div className="space-y-3">
              {!wsOpen(tab) && (
                <Card>
                  <p className="text-sm text-brand-gray">هذا التبويب مقفل حتى اعتماد التبويب السابق من المدير.</p>
                </Card>
              )}
              {wsOpen(tab) && (
                <>
              {tab === "closure" && comparison && (
                <Card>
                  <h3 className="mb-2 font-bold text-primary">مقارنة الوثيقة والإغلاق</h3>
                  <ClosureComparison pairs={comparison.pairs} budgetLines={comparison.budget_lines} />
                </Card>
              )}
              <div className="flex flex-wrap justify-end gap-2">
                <Button type="button" variant="secondary" onClick={() => void exportKind(tab === "document" ? "document" : "closure")}>
                  تصدير PDF
                </Button>
              </div>
              {tab === "document" ? (
                <DocumentTab
                  sections={sectionsFor("document")}
                  drafts={sectionDrafts}
                  canEdit={canEditWorkspace("document")}
                  canApprove={!!dossier.bypass_workspace_gates}
                  savingKey={savingKey}
                  decidingKey={decidingKey}
                  fixedPhases={schema?.document_fixed_phases || []}
                  teamCandidates={teamCandidates}
                  onDraftChange={(sectionKey, data) =>
                    setSectionDrafts((p) => ({ ...p, [`document:${sectionKey}`]: data }))
                  }
                  onSave={(sectionKey) => void saveSection("document", sectionKey)}
                  onDecide={(sectionKey, decision) => void decideDocumentSection(sectionKey, decision)}
                />
              ) : (
                sectionsFor("closure").map(({ def, status }) => {
                  const kind = "closure" as const;
                  const draftKey = `${kind}:${def.key}`;
                  const editable = canEditWorkspace("closure");
                  return (
                    <Card key={def.key}>
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <h3 className="font-bold text-primary">{def.label}</h3>
                          <p className="text-xs text-brand-gray">
                            {SECTION_STATUS_AR[status] || status}
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
                })
              )}
                </>
              )}
            </div>
          )}

          {tab === "plan" && (
            <Card>
              {!wsOpen("plan") ? (
                <p className="text-sm text-brand-gray">الخطة مقفلة حتى اعتماد الوثيقة.</p>
              ) : (
                <>
              <div className="mb-3 flex flex-wrap gap-2">
                {canSubmitWorkspace("plan") && (
                  <Button type="button" onClick={() => void submitActiveWorkspace()}>
                    إرسال الخطة للاعتماد
                  </Button>
                )}
              </div>
              <ActivitiesPanel
                stages={dossier.stages}
                activities={activities}
                canEdit={canEditWorkspace("plan")}
                canApprove={!!dossier.bypass_workspace_gates}
                phaseStatus={Object.fromEntries(
                  dossier.sections.filter((s) => s.kind === "plan").map((s) => [s.key, s.status]),
                )}
                onDecidePhase={(key, decision) => void decidePlanPhase(key, decision)}
                onUpdateStage={async (order, payload) => {
                  const res = await authFetch(`/api/projectdocs/dossiers/${dossier.id}/stages/${order}/`, {
                    method: "PATCH",
                    body: JSON.stringify(payload),
                  });
                  const data = await res.json().catch(() => ({}));
                  if (!res.ok) {
                    toast.error({ title: data.detail || "تعذّر حفظ تاريخ المرحلة" });
                    return;
                  }
                  setDossier((prev) =>
                    prev
                      ? { ...prev, stages: prev.stages.map((s) => (s.order === order ? { ...s, ...data } : s)) }
                      : prev,
                  );
                }}
                onUpdate={async (id, payload) => {
                  const res = await authFetch(`/api/projectdocs/dossiers/${dossier.id}/activities/${id}/`, {
                    method: "PATCH",
                    body: JSON.stringify(payload),
                  });
                  const data = await res.json().catch(() => ({}));
                  if (!res.ok) {
                    toast.error({ title: data.title || data.detail || "تعذّر الحفظ" });
                    return;
                  }
                  setActivities((prev) => prev.map((a) => (a.id === id ? data : a)));
                }}
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
                  await load("silent");
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
                  await load("silent");
                }}
                onDelete={async (id) => {
                  const res = await authFetch(`/api/projectdocs/dossiers/${dossier.id}/activities/${id}/`, {
                    method: "DELETE",
                  });
                  if (!res.ok && res.status !== 204) {
                    toast.error({ title: "تعذّر الحذف" });
                    return;
                  }
                  await load("silent");
                }}
              />
                </>
              )}
            </Card>
          )}

          {tab === "board" && (
            <Card>
              {!wsOpen("board") ? (
                <p className="text-sm text-brand-gray">اللوحة مقفلة حتى اعتماد الإغلاق.</p>
              ) : (
                <>
              <div className="mb-3 flex flex-wrap gap-2">
                {canSubmitWorkspace("board") && (
                  <Button type="button" onClick={() => void submitActiveWorkspace()}>
                    إرسال اللوحة للاعتماد
                  </Button>
                )}
                {workspaces.find((w) => w.key === "board")?.status === "submitted" && (
                  <>
                    <Button type="button" onClick={() => void adminDecideWorkspace("approved")}>
                      اعتماد (مدير/مشرف)
                    </Button>
                    <Button type="button" variant="secondary" onClick={() => void adminDecideWorkspace("returned")}>
                      إعادة للتعديل
                    </Button>
                  </>
                )}
              </div>
              <DossierDashboard
                data={dash as never}
                canAllocate={!!dossier.bypass_workspace_gates || canEditWorkspace("board")}
                canSpend={canEditWorkspace("board")}
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
                  await load("silent");
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
                  await load("silent");
                }}
              />
                </>
              )}
            </Card>
          )}
        </>
      )}
    </AdminShell>
  );
}
