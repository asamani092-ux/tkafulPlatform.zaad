/**
 * مساعد عرض دورة حياة المشروع — دوال نقية.
 * التعقيد: O(A) لعدد الإجراءات.
 */
import { LIFECYCLE_ACTION_LABELS, STATUS_LABELS } from "../components/pages/projects/types";
import { labelAr } from "../i18n/labels";

export function statusLabel(status: string): string {
  return labelAr(STATUS_LABELS, status);
}

export function actionLabels(nextActions: string[]): string[] {
  return nextActions.map((a) => labelAr(LIFECYCLE_ACTION_LABELS, a));
}
