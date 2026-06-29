import type { ReactNode } from "react";

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  onRowClick?: (row: T) => void;
  emptyText?: string;
}

/** جدول بيانات موحّد (‎.tmkeen-table) مع رؤوس وتظليل وتمرير. */
export default function DataTable<T>({
  columns,
  rows,
  onRowClick,
  emptyText = "لا توجد بيانات",
}: DataTableProps<T>) {
  return (
    <table className="tmkeen-table">
      <thead>
        <tr>
          {columns.map((c) => (
            <th key={c.key}>{c.header}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr>
            <td colSpan={columns.length} style={{ textAlign: "center", color: "var(--tmkeen-brand-gray)" }}>
              {emptyText}
            </td>
          </tr>
        ) : (
          rows.map((row, i) => (
            <tr key={i} onClick={onRowClick ? () => onRowClick(row) : undefined}>
              {columns.map((c) => (
                <td key={c.key}>{c.render ? c.render(row) : String((row as Record<string, unknown>)[c.key] ?? "")}</td>
              ))}
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}
