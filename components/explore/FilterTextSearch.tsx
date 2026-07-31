"use client";

// ============================================================
// C-Discover — Text Search Filter
// ============================================================

import { Search, X } from "lucide-react";

interface FilterTextSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function FilterTextSearch({
  value,
  onChange,
  placeholder = "Search by name…",
}: FilterTextSearchProps) {
  return (
    <div className="relative">
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-8 pr-7 py-1.5 text-sm border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-400 placeholder:text-gray-400"
        aria-label={placeholder}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear search"
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
