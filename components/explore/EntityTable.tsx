"use client";

// ============================================================
// C-Discover — Generic Sortable Entity Table
// T-40: SPEC.md §5.3 EC-07, §7.3 (data-entity-id on every <tr>)
// ============================================================

import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Column<T> {
  /** Unique key for this column (used as React key). */
  key: string;
  /** Column header label. */
  label: string;
  /**
   * The field name to pass to onSort when this column header is clicked.
   * Omit to make the column non-sortable.
   */
  sortKey?: string;
  /** Render the cell value for this column. */
  render: (entity: T) => React.ReactNode;
  headerClassName?: string;
  cellClassName?: string;
  /** Horizontal alignment of header and cell. Defaults to "left". */
  align?: "left" | "right" | "center";
  /**
   * Pins this column to the right edge of the table (with a hairline
   * shadow separator) so it stays visible without horizontal scroll.
   * Phase 1.3: used for the merged row-actions column.
   */
  sticky?: boolean;
}

interface EntityTableProps<T extends { id: string }> {
  data: T[];
  columns: Column<T>[];
  sortField: string;
  sortDir: "asc" | "desc";
  onSort: (field: string) => void;
  onRowClick?: (entity: T) => void;
  emptyMessage?: string;
  /** Accessible caption for screen readers / agents. */
  caption?: string;
}

export function EntityTable<T extends { id: string }>({
  data,
  columns,
  sortField,
  sortDir,
  onSort,
  onRowClick,
  emptyMessage = "No results match the current filters.",
  caption,
}: EntityTableProps<T>) {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-[0_1px_2px_rgba(15,27,42,0.03)]">
      <table className="w-full text-sm border-collapse" role="grid">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            {columns.map((col) => {
              const isSorted = col.sortKey === sortField;
              const canSort = !!col.sortKey;

              return (
                <th
                  key={col.key}
                  scope="col"
                  className={cn(
                    "px-3 py-2.5 text-xs font-semibold text-gray-600 whitespace-nowrap select-none",
                    col.align === "right"
                      ? "text-right"
                      : col.align === "center"
                        ? "text-center"
                        : "text-left",
                    canSort &&
                      "cursor-pointer hover:text-brand-900 hover:bg-gray-100",
                    col.sticky &&
                      "sticky right-0 z-20 bg-gray-50 shadow-[-4px_0_6px_-4px_rgba(15,27,42,0.12)]",
                    col.headerClassName,
                  )}
                  onClick={canSort ? () => onSort(col.sortKey!) : undefined}
                  aria-sort={
                    isSorted
                      ? sortDir === "asc"
                        ? "ascending"
                        : "descending"
                      : canSort
                        ? "none"
                        : undefined
                  }
                >
                  {canSort ? (
                    <span className="inline-flex items-center gap-1">
                      {col.label}
                      {isSorted ? (
                        sortDir === "asc" ? (
                          <ArrowUp className="h-3 w-3 text-gold-600" />
                        ) : (
                          <ArrowDown className="h-3 w-3 text-gold-600" />
                        )
                      ) : (
                        <ArrowUpDown className="h-3 w-3 text-gray-300" />
                      )}
                    </span>
                  ) : (
                    col.label
                  )}
                </th>
              );
            })}
          </tr>
        </thead>

        <tbody className="divide-y divide-gray-100">
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-10 text-center text-gray-400 text-sm"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((entity, i) => (
              <tr
                key={entity.id}
                data-entity-id={entity.id}
                onClick={() => onRowClick?.(entity)}
                className={cn(
                  i % 2 === 1 && "bg-gray-50/50",
                  onRowClick &&
                    "cursor-pointer hover:bg-brand-50/70 focus-within:bg-brand-50/70",
                )}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      "px-3 py-2.5 text-gray-700 whitespace-nowrap",
                      col.align === "right"
                        ? "text-right"
                        : col.align === "center"
                          ? "text-center"
                          : "text-left",
                      col.sticky &&
                        cn(
                          "sticky right-0 z-10 shadow-[-4px_0_6px_-4px_rgba(15,27,42,0.12)]",
                          i % 2 === 1 ? "bg-gray-50" : "bg-white",
                        ),
                      col.cellClassName,
                    )}
                  >
                    {col.render(entity)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
