import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../../contexts/AuthContext";
import { useToast } from "../../../contexts/ToastContext";
import { authFetch } from "../../../lib/api";
import UserShell from "../../layout/UserShell";
import Card from "../../ui/Card";
import Button from "../../ui/Button";
import { AUTO_STATUS_AR, STAGE_KEY_AR, type StageActivity } from "../../dossier/types";

/** مهام الخطة التنفيذية المسندة للمستخدم (منفصل عن مهام التطوع). */
export default function MyPlanTasks() {
  const { access } = useAuth();
  const { success, error } = useToast();
  const [rows, setRows] = useState<StageActivity[]>([]);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [completeId, setCompleteId] = useState<number | null>(null);
  const [form, setForm] = useState({
    lessons: "",
    notes: "",
    evidence_url: "",
    evidence_title: "",
    file: null as File | null,
  });

  const load = () => {
    authFetch("/api/projectdocs/my-activities/")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setRows(Array.isArray(d.results) ? d.results : []))
      .catch(() => {});
  };

  useEffect(() => {
    if (access) load();
  }, [access]);

  const setInProgress = async (id: number) => {
    setBusyId(id);
    try {
      const res = await authFetch(`/api/projectdocs/my-activities/${id}/`, {
        method: "PATCH",
        body: JSON.stringify({ manual_status: "in_progress" }),
      });
      if (!res.ok) throw new Error();
      success({ title: "تم تحديث الحالة" });
      load();
    } catch {
      error({ title: "تعذّر تحديث الحالة" });
    } finally {
      setBusyId(null);
    }
  };

  const submitComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (completeId == null) return;
    if (!form.evidence_url.trim() && !form.file) {
      error({ title: "الشاهد مطلوب (ملف أو رابط)" });
      return;
    }
    setBusyId(completeId);
    try {
      const fd = new FormData();
      fd.append("lessons", form.lessons);
      fd.append("notes", form.notes);
      fd.append("evidence_url", form.evidence_url);
      fd.append("evidence_title", form.evidence_title);
      if (form.file) fd.append("file", form.file);
      const res = await authFetch(`/api/projectdocs/my-activities/${completeId}/complete/`, {
        method: "POST",
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const raw = data.detail ?? data.evidence ?? data.lessons;
        throw new Error(typeof raw === "string" ? raw : "تعذّر الإتمام");
      }
      success({ title: "تم إتمام المهمة" });
      setCompleteId(null);
      setForm({ lessons: "", notes: "", evidence_url: "", evidence_title: "", file: null });
      load();
    } catch (err) {
      error({ title: err instanceof Error ? err.message : "تعذّر الإتمام" });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <UserShell>
      <h1 className="mb-2 text-2xl font-bold text-primary">مهام المشاريع المسندة</h1>
      <p className="mb-6 text-sm text-brand-gray">
        مهام الخطة التنفيذية المسندة إليك.{" "}
        <Link to="/user/tasks" className="font-bold text-primary hover:underline">
          مهام التطوع ←
        </Link>
      </p>
      <div className="space-y-4">
        {rows.length === 0 ? (
          <Card>
            <p className="text-center text-sm text-brand-gray">لا توجد مهام مسندة حالياً.</p>
          </Card>
        ) : (
          rows.map((a) => (
            <Card key={a.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-bold text-primary">{a.title}</h2>
                  <p className="text-xs text-brand-gray">
                    {a.project_name || "مشروع"} · {STAGE_KEY_AR[a.stage_key || ""] || a.stage_key || "مرحلة"} ·{" "}
                    {AUTO_STATUS_AR[a.auto_status] || a.auto_status}
                  </p>
                  {a.project_slug && (
                    <Link
                      to={`/Admin/projects/${a.project_slug}/dossier`}
                      className="mt-1 inline-block text-xs font-bold text-primary hover:underline"
                    >
                      فتح ملف المشروع
                    </Link>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {a.manual_status !== "done" && a.manual_status !== "in_progress" && (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={busyId === a.id}
                      onClick={() => void setInProgress(a.id)}
                    >
                      بدء التنفيذ
                    </Button>
                  )}
                  {a.manual_status !== "done" && (
                    <Button
                      type="button"
                      size="sm"
                      disabled={busyId === a.id}
                      onClick={() => {
                        setCompleteId(a.id);
                        setForm({
                          lessons: a.lessons || "",
                          notes: a.notes || "",
                          evidence_url: "",
                          evidence_title: "",
                          file: null,
                        });
                      }}
                    >
                      إتمام
                    </Button>
                  )}
                </div>
              </div>
              {completeId === a.id && (
                <form className="mt-4 space-y-3 border-t border-surface-border pt-3" onSubmit={submitComplete}>
                  <label className="block text-sm">
                    <span className="label-field">الدرس المستفاد</span>
                    <textarea
                      className="input-field mt-1 w-full"
                      rows={2}
                      value={form.lessons}
                      onChange={(e) => setForm((p) => ({ ...p, lessons: e.target.value }))}
                      required
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="label-field">ملاحظات</span>
                    <textarea
                      className="input-field mt-1 w-full"
                      rows={2}
                      value={form.notes}
                      onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="label-field">رابط الشاهد</span>
                    <input
                      className="input-field mt-1 w-full"
                      value={form.evidence_url}
                      onChange={(e) => setForm((p) => ({ ...p, evidence_url: e.target.value }))}
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="label-field">ملف الشاهد</span>
                    <input
                      type="file"
                      className="mt-1 block w-full text-sm"
                      onChange={(e) => setForm((p) => ({ ...p, file: e.target.files?.[0] || null }))}
                    />
                  </label>
                  <div className="flex gap-2">
                    <Button type="submit" disabled={busyId === a.id}>
                      تأكيد الإتمام
                    </Button>
                    <Button type="button" variant="secondary" onClick={() => setCompleteId(null)}>
                      إلغاء
                    </Button>
                  </div>
                </form>
              )}
            </Card>
          ))
        )}
      </div>
    </UserShell>
  );
}
