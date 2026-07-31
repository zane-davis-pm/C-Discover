"use client";

// ============================================================
// C-Discover — Row Actions Cell
// Phase 1.3 (PROJECT_PLAN_MULTISTATE.md): visit-website / shortlist /
// compare, merged into a single sticky-right column so these actions
// stay reachable without horizontal scroll on narrower table viewports
// (verified at 1280px min-width).
// ============================================================

import { ExternalLink } from "lucide-react";
import { ShortlistButton } from "./ShortlistButton";
import { CompareCheckbox } from "./CompareCheckbox";
import { NoteButton } from "@/components/notes/NoteButton";
import { gapLabel } from "@/lib/utils";
import { stateHasNoWebsiteLinks } from "@/lib/entity-type-meta";
import type { AnyEntity } from "@/lib/types";

export function RowActionsCell({ entity }: { entity: AnyEntity }) {
  const showWebsite = !stateHasNoWebsiteLinks(entity.state);
  return (
    <div className="flex items-center justify-end gap-3">
      {showWebsite &&
        (entity.website ? (
          <a
            href={entity.website}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-brand-600 hover:text-brand-700 text-xs"
            onClick={(e) => e.stopPropagation()}
            aria-label={`Visit ${entity.name} website`}
          >
            <ExternalLink className="h-3 w-3" />
            Visit
          </a>
        ) : (
          <span className="text-gray-400 italic text-xs">
            {gapLabel(
              entity.data_gaps.find((g) => g.field === "website")?.reason ??
                "unknown",
            )}
          </span>
        ))}
      <NoteButton
        id={entity.id}
        state={entity.state}
        name={entity.name}
        compact
      />
      <ShortlistButton entity={entity} compact />
      <CompareCheckbox
        state={entity.state}
        type={entity.type}
        id={entity.id}
        name={entity.name}
      />
    </div>
  );
}
