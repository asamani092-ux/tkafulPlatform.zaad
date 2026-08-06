import { Link } from "react-router-dom";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

/** مسار تنقّل — عقد Breadcrumb (RTL، aria-current). */
export default function Breadcrumb({ items }: BreadcrumbProps) {
  if (!items.length) return null;
  return (
    <nav aria-label="breadcrumb" className="mb-4">
      <ol className="zad-breadcrumb">
        {items.map((item, i) => {
          const last = i === items.length - 1;
          return (
            <li key={`${item.label}-${i}`} className="inline-flex items-center gap-2">
              {i > 0 && <span className="zad-breadcrumb__sep" aria-hidden="true">‹</span>}
              {last || !item.href ? (
                <span aria-current={last ? "page" : undefined}>{item.label}</span>
              ) : (
                <Link to={item.href}>{item.label}</Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
