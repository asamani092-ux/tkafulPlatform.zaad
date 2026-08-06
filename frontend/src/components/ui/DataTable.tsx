import type { ReactNode } from "react";
import { EmptyState } from "../feedback/PageStates";

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

/** جدول بيانات موحّد (‎.tmkeen-table) — عقد DataTable + EmptyState. */
export default function DataTable<T>({
  columns,
  rows,
  onRowClick,
  emptyText = "لا توجد بيانات",
}: DataTableProps<T>) {
  if (rows.length === 0) {
    return <EmptyState title={emptyText} />;
  }
  return (
    <div className="overflow-x-auto">
      <table className="tmkeen-table">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} scope="col">
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={i}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              style={onRowClick ? { cursor: "pointer" } : undefined}
            >
              {columns.map((c) => (
                <td key={c.key}>
                  {c.render ? c.render(row) : String((row as Record<string, unknown>)[c.key] ?? "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
