"use client";

// ============================================================
// C-Discover — Special District Purpose Cohort View
// V3 §4 / V3-T-20, V3-C-01, V3-C-02, V3-C-03
// A browsable, count-per-category directory over purpose_category,
// computed client-side from the already-loaded districts array
// (no new data fetch). Clicking a category applies it as the sole
// active filter and switches the page to List View.
// ============================================================

import { ChevronRight } from "lucide-react";
import { SPECIAL_DISTRICT_PURPOSES } from "@/lib/types";
import type { SpecialDistrict, SpecialDistrictPurpose } from "@/lib/types";

interface PurposeCohortViewProps {
  districts: SpecialDistrict[];
  onSelectPurpose: (purpose: SpecialDistrictPurpose) => void;
}

export function PurposeCohortView({
  districts,
  onSelectPurpose,
}: PurposeCohortViewProps) {
  const counts = new Map<SpecialDistrictPurpose, number>();
  for (const purpose of SPECIAL_DISTRICT_PURPOSES) counts.set(purpose, 0);
  for (const d of districts) {
    counts.set(d.purpose_category, (counts.get(d.purpose_category) ?? 0) + 1);
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg">
      <div className="px-4 py-3 border-b border-gray-200">
        <h2 className="text-sm font-semibold text-gray-700">
          Special Districts by Purpose
        </h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Pick a category to browse only those districts.
        </p>
      </div>
      <ul role="list" className="divide-y divide-gray-100">
        {SPECIAL_DISTRICT_PURPOSES.map((purpose) => {
          const count = counts.get(purpose) ?? 0;
          return (
            <li key={purpose}>
              <button
                type="button"
                onClick={() => onSelectPurpose(purpose)}
                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50"
                aria-label={`View all ${count} ${purpose} special districts`}
              >
                <span className="text-sm font-medium text-gray-800">
                  {purpose}{" "}
                  <span className="text-gray-400 font-normal">
                    ({count.toLocaleString()})
                  </span>
                </span>
                <span className="inline-flex items-center gap-1 text-xs text-brand-600 font-medium">
                  View all
                  <ChevronRight className="h-3.5 w-3.5" />
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
