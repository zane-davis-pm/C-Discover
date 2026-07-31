"use client";

// ============================================================
// C-Discover — Shortlist Add / Remove Button
// T-43: SPEC.md §5.3 EC-05, EC-06, §7.3 (aria-label spec)
// aria-label MUST be " Add [Name] to shortlist " or
//" Remove [Name] from shortlist "
// ============================================================

import { BookmarkPlus, BookmarkMinus } from "lucide-react";
import { useShortlist } from "@/lib/shortlist";
import type { AnyEntity } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ShortlistButtonProps {
  entity: AnyEntity;
  /**
   * compact=true: icon only, smaller text — used in table rows.
   * compact=false (default): icon + label — used in detail modal.
   */
  compact?: boolean;
  className?: string;
}

export function ShortlistButton({
  entity,
  compact = false,
  className,
}: ShortlistButtonProps) {
  const add = useShortlist((s) => s.add);
  const remove = useShortlist((s) => s.remove);
  const inShortlist = useShortlist((s) => s.has(entity.id, entity.state));

  if (inShortlist) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          remove(entity.id, entity.state);
        }}
        aria-label={`Remove ${entity.name} from shortlist`}
        className={cn(
          "inline-flex items-center gap-1 font-medium rounded",
          compact
            ? "text-xs text-red-500 hover:text-red-700"
            : "text-sm text-red-600 hover:text-red-700 px-3 py-1.5 border border-red-200 hover:bg-red-50 rounded-md",
          className,
        )}
      >
        <BookmarkMinus className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
        {!compact && "Remove from Shortlist"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        add(entity);
      }}
      aria-label={`Add ${entity.name} to shortlist`}
      className={cn(
        "inline-flex items-center gap-1 font-medium rounded",
        compact
          ? "text-xs text-brand-600 hover:text-brand-800"
          : "text-sm text-white bg-brand-800 hover:bg-brand-900 px-3 py-1.5 rounded-md",
        className,
      )}
    >
      <BookmarkPlus className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
      {!compact && "Add to Shortlist"}
    </button>
  );
}
