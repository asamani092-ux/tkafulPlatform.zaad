import type { ReactNode } from "react";
import Card from "./Card";
import Badge from "./Badge";

interface BeneficiaryCardProps {
  name: string;
  contact?: string;
  details?: string;
  status?: string;
  statusTone?: "primary" | "success" | "warning" | "danger";
  actions?: ReactNode;
}

/** بطاقة مستفيد — عرض طلب/مستفيد مع شارة وحالة. */
export default function BeneficiaryCard({
  name,
  contact,
  details,
  status,
  statusTone = "warning",
  actions,
}: BeneficiaryCardProps) {
  return (
    <Card>
      <div className="zad-beneficiary">
        <div className="zad-avatar" aria-hidden="true">{name.trim().charAt(0) || "?"}</div>
        <div className="zad-beneficiary__meta">
          <div className="mb-1 flex items-center justify-between gap-2">
            <h3 className="zad-beneficiary__name">{name}</h3>
            {status && <Badge variant={statusTone}>{status}</Badge>}
          </div>
          {contact && <p className="zad-beneficiary__sub" dir="auto">{contact}</p>}
          {details && <p className="zad-beneficiary__sub">{details}</p>}
          {actions && <div className="mt-3 flex flex-wrap gap-2">{actions}</div>}
        </div>
      </div>
    </Card>
  );
}
