import type { ReactNode } from "react";
import Modal from "./Modal";
import Button from "./Button";

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  children?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
}

/** حوار تأكيد — عقد Dialog variant confirm/destructive. يحافظ على واجهة Modal الأساسية. */
export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  children,
  confirmLabel = "تأكيد",
  cancelLabel = "إلغاء",
  destructive = false,
  loading = false,
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      {children && <div className="mb-4 text-sm text-brand-gray">{children}</div>}
      <div className="flex flex-wrap gap-2 justify-start">
        <Button
          onClick={onConfirm}
          disabled={loading}
          variant={destructive ? "secondary" : "primary"}
          aria-busy={loading || undefined}
        >
          {loading ? "جارٍ التنفيذ…" : confirmLabel}
        </Button>
        <Button variant="secondary" onClick={onClose} disabled={loading}>
          {cancelLabel}
        </Button>
      </div>
    </Modal>
  );
}
