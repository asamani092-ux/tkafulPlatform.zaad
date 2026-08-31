import type { ReactNode } from "react";
import Card from "./Card";
import Badge from "./Badge";
import Button from "./Button";

export interface CompactListCardProps {
  /** الاسم الظاهر — الإشارة الوحيدة للهوية في الصف المختصر */
  name: string;
  /** نشط / غير نشط */
  active: boolean;
  /** تاريخ الإنشاء (ISO أو قابل للتحليل بـ Date) */
  createdAt?: string | null;
  onDetails: () => void;
  detailsLabel?: string;
  /** عنصر بصري اختياري قبل الاسم (لون، أيقونة…) */
  leading?: ReactNode;
  activeLabel?: string;
  inactiveLabel?: string;
}

function formatCreated(value?: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value.slice(0, 10);
  return d.toLocaleDateString("ar");
}

/**
 * بطاقة قائمة مختصرة موحّدة للمنصّة:
 * الاسم + الحالة + تاريخ الإنشاء + زر التفاصيل.
 * O(1) عرض لكل عنصر.
 */
export default function CompactListCard({
  name,
  active,
  createdAt,
  onDetails,
  detailsLabel = "التفاصيل",
  leading,
  activeLabel = "نشط",
  inactiveLabel = "غير نشط",
}: CompactListCardProps) {
  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          {leading}
          <h3 className="truncate text-base font-bold text-primary">{name}</h3>
          <Badge variant={active ? "success" : "danger"}>{active ? activeLabel : inactiveLabel}</Badge>
          <span className="text-xs text-brand-gray">{formatCreated(createdAt)}</span>
        </div>
        <Button type="button" variant="secondary" onClick={onDetails}>{detailsLabel}</Button>
      </div>
    </Card>
  );
}
