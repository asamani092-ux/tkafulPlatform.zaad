/** أنواع ملف المشروع — تتوافق مع مخطط الخادم. */
export type FieldType =
  | "text"
  | "textarea"
  | "number"
  | "date"
  | "select"
  | "table"
  | "logical_matrix"
  | "phases_activities";

export interface FieldColumn {
  key: string;
  label: string;
  type?: "text" | "number" | "date" | "select";
  group?: string;
  computed?: string;
  readonly?: boolean;
  hidden?: boolean;
  options?: string[];
  option_labels?: Record<string, string>;
}

export interface SchemaField {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: string[];
  columns?: FieldColumn[];
  header_groups?: Array<{ key: string; label: string }>;
  readonly?: boolean;
}

export interface SchemaSection {
  key: string;
  label: string;
  stage: string;
  fields: SchemaField[];
  ui?: string;
  from_card?: boolean;
}

export interface DossierSchema {
  stages: Array<{ order: number; key: string; label: string }>;
  workspaces?: Array<{ order: number; key: string; label: string; needs_approval?: boolean }>;
  document: SchemaSection[];
  closure: SchemaSection[];
  card?: SchemaSection[];
  document_fixed_phases?: Array<{ key: string; label: string }>;
}

export interface DossierSectionRow {
  id: number;
  kind: "card" | "document" | "plan" | "closure";
  key: string;
  data: Record<string, unknown>;
  status: string;
  updated_at?: string;
}

export interface DossierStageRow {
  id: number;
  order: number;
  key: string;
  planned_start: string | null;
  planned_end: string | null;
  deliverable_title: string;
  deliverable_date: string | null;
  status: string;
  return_note: string;
  approved_at: string | null;
}

export interface ProjectDossier {
  id: number;
  project: number;
  project_slug: string;
  project_name: string;
  code: string;
  marketing_name: string;
  portfolio: string;
  department: string;
  section: string;
  strategic_goal: string;
  location: string;
  projects_office_name: string;
  projects_committee_name: string;
  sponsor_name: string;
  sponsor_email: string;
  execution_start?: string | null;
  execution_end?: string | null;
  manager: number | null;
  manager_username: string;
  manager_email: string;
  current_stage: string;
  status: string;
  budget_association: string | number;
  budget_donation: string | number;
  budget_total: string | number;
  sections: DossierSectionRow[];
  stages: DossierStageRow[];
  workspaces?: Array<{
    id: number;
    order: number;
    key: string;
    label: string;
    status: string;
    return_note: string;
    needs_approval: boolean;
  }>;
  bypass_workspace_gates?: boolean;
}

export interface StageActivity {
  id: number;
  stage: number;
  code: string;
  parent: number | null;
  title: string;
  responsible: string;
  start_date: string | null;
  end_date: string | null;
  manual_status: string;
  auto_status: string;
  progress_pct: number;
  kpi: string;
  sponsor_rating: number | null;
  lessons: string;
  notes: string;
  risks: string;
  sort_order: number;
  source?: string;
  locked?: boolean;
}

export const STAGE_STATUS_AR: Record<string, string> = {
  locked: "مقفلة",
  active: "نشطة",
  submitted: "بانتظار الاعتماد",
  approved: "معتمدة",
  returned: "معادة للتعديل",
};

export const SECTION_STATUS_AR: Record<string, string> = {
  empty: "فارغ",
  filled: "معبّأ",
  submitted: "مُرسل",
  approved: "معتمد",
  returned: "معاد للتعديل",
};

export const AUTO_STATUS_AR: Record<string, string> = {
  not_due: "لم يحن",
  in_progress: "جاري",
  done: "منفذ",
  delayed: "متعثر",
  stopped: "موقوف",
};

export const DOSSIER_STATUS_AR: Record<string, string> = {
  draft: "مسودة",
  in_progress: "قيد التنفيذ",
  pending_approval: "بانتظار الاعتماد",
  approved: "معتمد",
  closed: "مغلق",
};

export const STAGE_KEY_AR: Record<string, string> = {
  define: "تحديد وتعريف المشروع",
  prepare: "إعداد المشروع",
  plan: "التخطيط للمشروع",
  execute: "تنفيذ المشروع",
  close: "إغلاق المشروع",
};
