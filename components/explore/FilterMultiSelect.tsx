"use client";

// ============================================================
// C-Discover — Multi-Select Filter (checkboxes)
// Used for regions, purpose categories, and county lists.
// searchable=true adds a filter input above the list.
// ============================================================

import { useState } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface FilterMultiSelectProps {
  label: string;
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  /** If true, shows a search box to filter options. */
  searchable?: boolean;
  /** Max height before list scrolls. Defaults to 180px. */
  maxHeight?: string;
}

export function FilterMultiSelect({
  label,
  options,
  selected,
  onChange,
  searchable = false,
  maxHeight = "180px",
}: FilterMultiSelectProps) {
  const [query, setQuery] = useState("");

  const visible = searchable
    ? options.filter((o) => o.toLowerCase().includes(query.toLowerCase()))
    : options;

  function toggle(option: string) {
    if (selected.includes(option)) {
      onChange(selected.filter((s) => s !== option));
    } else {
      onChange([...selected, option]);
    }
  }

  if (options.length === 0) return null;

  return (
    <fieldset className="min-w-0">
      <legend className="block text-xs font-medium text-gray-600 mb-1.5">
        {label}
        {selected.length > 0 && (
          <button
            type="button"
            onClick={() => onChange([])}
            className="ml-2 text-brand-600 hover:text-brand-700 text-xs font-normal"
            aria-label={`Clear ${label} filter`}
          >
            Clear
          </button>
        )}
      </legend>

      {searchable && options.length > 6 && (
        <div className="relative mb-1.5">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400 pointer-events-none" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Filter ${label.toLowerCase()}…`}
            className="w-full pl-6 pr-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-400 placeholder:text-gray-400"
            aria-label={`Filter ${label} options`}
          />
        </div>
      )}

      <div
        className="overflow-y-auto space-y-1 pr-0.5"
        style={{ maxHeight }}
        role="group"
        aria-label={`${label} checkboxes`}
      >
        {visible.length === 0 && (
          <p className="text-xs text-gray-400 py-1">No options match.</p>
        )}
        {visible.map((option) => {
          const checked = selected.includes(option);
          const id = `multiselect-${label.replace(/\s+/g, "-")}-${option.replace(/\s+/g, "-")}`;
          return (
            <label
              key={option}
              htmlFor={id}
              className={cn(
                "flex items-center gap-2 text-xs py-0.5 cursor-pointer rounded px-1 -mx-1",
                checked
                  ? "text-brand-800 font-medium"
                  : "text-gray-700 hover:bg-gray-50",
              )}
            >
              <input
                type="checkbox"
                id={id}
                checked={checked}
                onChange={() => toggle(option)}
                className="h-3.5 w-3.5 rounded border-gray-300 text-brand-600 focus:ring-brand-500 shrink-0"
              />
              <span className="truncate" title={option}>
                {option}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
