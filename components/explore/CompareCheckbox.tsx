"use client";

// ============================================================
// C-Discover — Comparison Checkbox
// V3-T-30 (SPEC_V3.md §5.2): per-row checkbox added to explore tables,
// capped at COMPARE_MAX, same-type only (enforced by the store keying
// selections per EntityType — see lib/compare.ts).
// ============================================================

import { useCompareSelection, COMPARE_MAX } from "@/lib/compare";
import type { EntityType } from "@/lib/types";

interface CompareCheckboxProps {
  state: string;
  type: EntityType;
  id: string;
  name: string;
}

export function CompareCheckbox({ state, type, id, name }: CompareCheckboxProps) {
  const isSelected = useCompareSelection((s) =>
    (s.selected[state]?.[type] ?? []).includes(id)
  );
  const count = useCompareSelection((s) => (s.selected[state]?.[type] ?? []).length);
  const toggle = useCompareSelection((s) => s.toggle);

  const atLimit = !isSelected && count >= COMPARE_MAX;

  return (
    <input
      type="checkbox"
      checked={isSelected}
      disabled={atLimit}
      onClick={(e) => e.stopPropagation()}
      onChange={() => toggle(state, type, id)}
      aria-label={
        isSelected
          ? `Remove ${name} from comparison`
          : atLimit
            ? `Comparison limit of ${COMPARE_MAX} reached — remove another entity first`
            : `Add ${name} to comparison`
      }
      title={
        atLimit
          ? `You can compare up to ${COMPARE_MAX} entities at a time.`
          : undefined
      }
      className="h-3.5 w-3.5 rounded border-gray-300 text-brand-600 focus:ring-brand-500 cursor-pointer disabled:cursor-not-allowed disabled:opacity-30"
    />
  );
}
