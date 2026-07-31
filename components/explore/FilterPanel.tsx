"use client";

// ============================================================
// C-Discover — Filter Panel Sidebar Wrapper
// Collapsible on mobile; always visible on md+.
// Contains entity-specific filter controls via children.
// ============================================================

import { useState } from "react";
import { SlidersHorizontal, ChevronDown, X } from "lucide-react";
import { ActiveFilterBadge } from "./ActiveFilterBadge";
import { cn } from "@/lib/utils";

interface FilterPanelProps {
  activeFilterCount: number;
  onClearAll: () => void;
  children: React.ReactNode;
}

export function FilterPanel({
  activeFilterCount,
  onClearAll,
  children,
}: FilterPanelProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile toggle button */}
      <div className="md:hidden mb-3">
        <button
          type="button"
          onClick={() => setMobileOpen((o) => !o)}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium border border-gray-200 rounded-md bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-300 w-full"
          aria-expanded={mobileOpen}
          aria-controls="filter-panel-content"
        >
          <SlidersHorizontal className="h-4 w-4 text-gray-500" />
          <span>Filters</span>
          {activeFilterCount > 0 && (
            <ActiveFilterBadge count={activeFilterCount} />
          )}
          <span className="ml-auto">
            <ChevronDown
              className={cn(
                "h-4 w-4 text-gray-400",
                mobileOpen && "rotate-180",
              )}
            />
          </span>
        </button>
      </div>

      {/* Panel body */}
      <aside
        id="filter-panel-content"
        className={cn(
          "w-full md:w-64 lg:w-72 shrink-0",
          "md:block", // always visible on md+
          !mobileOpen && "hidden md:block", // hidden on mobile unless open
        )}
        aria-label="Filter controls"
      >
        <div className="surface-card p-4">
          {/* Panel header */}
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold text-brand-800 uppercase tracking-wider">
              Filters
            </span>
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={onClearAll}
                className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-800 font-medium"
                aria-label="Clear all filters"
              >
                <X className="h-3 w-3" />
                Clear all
              </button>
            )}
          </div>

          {/* Filter controls (provided by each explore page) */}
          <div className="space-y-5">{children}</div>
        </div>
      </aside>
    </>
  );
}
