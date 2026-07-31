"use client";

// ============================================================
// C-Discover — Persistent " Compare (n)" Bar
// V3-T-31 (SPEC_V3.md §5.2): appears when >=2 same-type entities are
// selected for comparison; disappears at 0-1. Also surfaces the
// transient " limit reached " message from the comparison store.
// ============================================================

import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { useCompareSelection } from "@/lib/compare";
import { ENTITY_TYPE_LABEL_PLURAL } from "@/lib/entity-type-meta";
import type { EntityType } from "@/lib/types";

export function CompareBar({ state, type }: { state: string; type: EntityType }) {
  const router = useRouter();
  const selected = useCompareSelection((s) => s.selected[state]?.[type] ?? []);
  const limitMessage = useCompareSelection((s) => s.limitMessage);
  const clear = useCompareSelection((s) => s.clear);
  const dismissLimitMessage = useCompareSelection((s) => s.dismissLimitMessage);

  const count = selected.length;
  const showBar = count >= 2;

  if (!showBar && !limitMessage) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 flex flex-col items-center gap-2 pointer-events-none">
      {limitMessage && (
        <div
          role="alert"
          className="pointer-events-auto mb-1 flex items-center gap-2 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-xs px-3 py-2 shadow-sm max-w-screen-sm"
        >
          <span>{limitMessage}</span>
          <button
            type="button"
            onClick={dismissLimitMessage}
            aria-label="Dismiss message"
            className="shrink-0 text-amber-500 hover:text-amber-700"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {showBar && (
        <div className="pointer-events-auto w-full border-t border-gray-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/90 shadow-[0_-4px_16px_rgba(15,27,42,0.08)]">
          <div className="max-w-screen-xl mx-auto px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
            <span className="text-sm text-gray-700 font-medium">
              Compare ({count}) {ENTITY_TYPE_LABEL_PLURAL[type]}
            </span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => clear(state, type)}
                className="text-xs text-gray-500 hover:text-gray-700 font-medium"
              >
                Clear selection
              </button>
              <button
                type="button"
                onClick={() =>
                  router.push(
                    `/${state}/compare?type=${type}&ids=${selected.join(",")}`
                  )
                }
                className="text-sm font-medium text-white bg-brand-800 hover:bg-brand-900 px-4 py-1.5 rounded-md"
              >
                Compare →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
