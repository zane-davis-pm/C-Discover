"use client";

// ============================================================
// C-Discover — Export to CSV Button
// T-62: SPEC.md §5.8 SL-06, §7.3 (aria-label spec)
// aria-label MUST be " Export shortlist to CSV "
// ============================================================

import { Download } from "lucide-react";
import { useShortlist } from "@/lib/shortlist";
import { useNotes } from "@/lib/notes";
import { downloadShortlistCsv } from "@/lib/export";

interface ExportButtonProps {
  className?: string;
}

export function ExportButton({ className }: ExportButtonProps) {
  const items = useShortlist((s) => s.items);
  const notes = useNotes((s) => s.notes);

  const handleExport = () => {
    if (items.length === 0) return;
    downloadShortlistCsv(items, notes);
  };

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={items.length === 0}
      aria-label="Export shortlist to CSV"
      className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md 
 ${
   items.length === 0
     ? "bg-gray-100 text-gray-400 cursor-not-allowed"
     : "bg-brand-600 text-white hover:bg-brand-700"
 }
 ${className ?? ""}`}
    >
      <Download className="h-4 w-4" />
      Export to CSV
    </button>
  );
}
