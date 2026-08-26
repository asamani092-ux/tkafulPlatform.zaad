/**
 * مساعد عرض دورة حياة المشروع — دوال نقية.
 * التعقيد: O(A) لعدد الإجراءات.
 */
import { LIFECYCLE_ACTION_LABELS, STATUS_LABELS } from "../components/pages/projects/types";

export function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

export function actionLabels(nextActions: string[]): string[] {
  return nextActions.map((a) => LIFECYCLE_ACTION_LABELS[a] ?? a);
}
