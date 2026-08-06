interface PaginationProps {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}

/** ترقيم صفحات — عقد DataTable.pagination. */
export default function Pagination({ page, totalPages, onChange }: PaginationProps) {
  if (totalPages <= 1) return null;
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1).slice(
    Math.max(0, page - 3),
    Math.min(totalPages, page + 2),
  );
  return (
    <nav className="zad-pagination" aria-label="ترقيم الصفحات">
      <button type="button" disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="السابق">
        السابق
      </button>
      {pages.map((p) => (
        <button
          key={p}
          type="button"
          data-active={p === page ? "true" : "false"}
          aria-current={p === page ? "page" : undefined}
          onClick={() => onChange(p)}
        >
          {p}
        </button>
      ))}
      <button type="button" disabled={page >= totalPages} onClick={() => onChange(page + 1)} aria-label="التالي">
        التالي
      </button>
    </nav>
  );
}
