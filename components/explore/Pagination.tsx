"use client";

// ============================================================
// C-Discover — Pagination Controls
// EM-11, ESPD-09: 50 rows/page, prev/next, page indicator.
// ============================================================

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({
  page,
  totalPages,
  onPageChange,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <nav
      className="flex items-center justify-center gap-2 pt-4"
      aria-label="Pagination"
    >
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        aria-label="Previous page"
        className={cn(
          "flex items-center gap-1 px-3 py-1.5 text-sm rounded-md border",
          page <= 1
            ? "border-gray-100 text-gray-300 cursor-not-allowed"
            : "border-gray-200 text-gray-600 hover:bg-white hover:border-brand-300 hover:text-brand-800 hover:shadow-sm",
        )}
      >
        <ChevronLeft className="h-4 w-4" />
        Prev
      </button>

      <span className="text-sm text-gray-500">
        Page <span className="font-semibold text-brand-900">{page}</span> of{" "}
        <span className="font-semibold text-brand-900">{totalPages}</span>
      </span>

      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        aria-label="Next page"
        className={cn(
          "flex items-center gap-1 px-3 py-1.5 text-sm rounded-md border",
          page >= totalPages
            ? "border-gray-100 text-gray-300 cursor-not-allowed"
            : "border-gray-200 text-gray-600 hover:bg-white hover:border-brand-300 hover:text-brand-800 hover:shadow-sm",
        )}
      >
        Next
        <ChevronRight className="h-4 w-4" />
      </button>
    </nav>
  );
}
