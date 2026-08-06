import type { ReactNode } from "react";
import Card from "./Card";

export interface DetailField {
  label: string;
  value: ReactNode;
}

interface DetailCardProps {
  title?: string;
  fields: DetailField[];
  footer?: ReactNode;
}

/** بطاقة عرض تفصيلي — شبكة حقول للقراءة. */
export default function DetailCard({ title, fields, footer }: DetailCardProps) {
  return (
    <Card>
      {title && <h2 className="mb-4 text-xl font-bold text-primary">{title}</h2>}
      <div className="zad-detail-card__grid">
        {fields.map((f) => (
          <div key={f.label} className="zad-detail-card__row">
            <span className="zad-detail-card__label">{f.label}</span>
            <span className="zad-detail-card__value">{f.value || "—"}</span>
          </div>
        ))}
      </div>
      {footer && <div className="mt-4">{footer}</div>}
    </Card>
  );
}
