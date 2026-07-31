"use client";

// ============================================================
// C-Discover — Range Filter (min / max number inputs)
// Used for population, income, revenue, expenditure, % Bachelor's+
// ============================================================

import type { RangeFilter } from "@/lib/types";

interface FilterRangeSliderProps {
  label: string;
  value: RangeFilter;
  onChange: (range: RangeFilter) => void;
  /** Optional: format the placeholder hint (e.g. "0" or "$0"). */
  placeholder?: { min?: string; max?: string };
  step?: number;
}

export function FilterRangeSlider({
  label,
  value,
  onChange,
  placeholder,
  step = 1,
}: FilterRangeSliderProps) {
  const [min, max] = value;

  function handleMin(raw: string) {
    const n = raw === "" ? null : Number(raw);
    onChange([isNaN(n as number) ? null : n, max]);
  }

  function handleMax(raw: string) {
    const n = raw === "" ? null : Number(raw);
    onChange([min, isNaN(n as number) ? null : n]);
  }

  return (
    <fieldset className="min-w-0">
      <legend className="block text-xs font-medium text-gray-600 mb-1.5">
        {label}
      </legend>
      <div className="flex items-center gap-1.5">
        <input
          type="number"
          value={min ?? ""}
          onChange={(e) => handleMin(e.target.value)}
          placeholder={placeholder?.min ?? "Min"}
          step={step}
          className="w-full min-w-0 px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-400 placeholder:text-gray-400"
          aria-label={`${label} minimum`}
        />
        <span className="text-gray-400 text-xs shrink-0">–</span>
        <input
          type="number"
          value={max ?? ""}
          onChange={(e) => handleMax(e.target.value)}
          placeholder={placeholder?.max ?? "Max"}
          step={step}
          className="w-full min-w-0 px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-400 placeholder:text-gray-400"
          aria-label={`${label} maximum`}
        />
      </div>
    </fieldset>
  );
}
