"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";
import { StateSelector } from "./StateSelector";
import { cn, isStale } from "@/lib/utils";
import { Map, AlertTriangle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useCurrentState } from "@/lib/state-context";
import { entityTypeExplorePath } from "@/lib/entity-type-meta";
import type { EntityType } from "@/lib/types";

interface NavLink {
  href: string;
  label: string;
  icon?: LucideIcon;
}

interface TopNavProps {
  /** ISO date (YYYY-MM-DD) of the last pipeline run, or "pending". */
  lastPipelineRun?: string;
}

const ENTITY_TAB_LABELS: Record<EntityType, string> = {
  county: "Counties",
  municipality: "Municipalities",
  school_district: "School Districts",
  special_district: "Special Districts",
};

/**
 * Nav links, state-prefixed and filtered to the entity types the current
 * state actually ships (special districts are state-optional — see
 * docs/states/SYNTHESIS.md). Falls back to all four types until the state
 * config has loaded, matching pre-multi-state behavior (no visible flash).
 */
function buildNavLinks(state: string, entityTypes: EntityType[] | null): NavLink[] {
  const types: EntityType[] = entityTypes ?? [
    "county",
    "municipality",
    "school_district",
    "special_district",
  ];
  const links: NavLink[] = types.map((type) => ({
    href: entityTypeExplorePath(state, type),
    label: ENTITY_TAB_LABELS[type],
  }));
  links.push({ href: `/${state}/map`, label: "Map", icon: Map });
  return links;
}

export function TopNav({ lastPipelineRun }: TopNavProps) {
  const pathname = usePathname();
  const stale = isStale(lastPipelineRun);
  const { state, config, manifest } = useCurrentState();
  const navLinks = buildNavLinks(state, config?.entity_types ?? null);

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 h-14 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 border-b border-gray-200 flex items-center px-4 gap-1"
      aria-label="Main navigation"
    >
      {/* Wordmark */}
      <Link
        href="/"
        className="mr-4 font-semibold text-brand-900 text-[1.05rem] tracking-tight shrink-0 hover:text-brand-700"
        style={{ fontFamily: "var(--font-display), Georgia, serif" }}
      >
        C‑Discover
      </Link>

      {/* Divider */}
      <div className="h-5 w-px bg-gray-200 mr-3" />

      {/* Primary nav links */}
      <div className="flex items-center gap-0.5 flex-1 overflow-x-auto">
        {navLinks.map(({ href, label, icon: Icon }) => {
          const active = href.endsWith("/map")
            ? pathname === href
            : pathname.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "relative flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium whitespace-nowrap",
                active
                  ? "text-brand-900"
                  : "text-gray-500 hover:text-brand-800",
              )}
              aria-current={active ? "page" : undefined}
            >
              {Icon != null && <Icon className="h-4 w-4" />}
              {label}
              <span
                className={cn(
                  "absolute left-3 right-3 -bottom-[1px] h-[2px] rounded-full bg-gold-500 origin-center",
                  active ? "scale-x-100" : "scale-x-0",
                )}
                aria-hidden="true"
              />
            </Link>
          );
        })}
      </div>

      {/* Staleness badge + shortlist indicator — always on the right */}
      <div className="ml-auto shrink-0 flex items-center gap-2">
        {stale && (
          <span
            className="flex items-center gap-1 px-2 py-1 rounded-md bg-amber-50 text-amber-700 text-xs font-medium"
            role="status"
            aria-label={`Data last updated ${lastPipelineRun} — refresh overdue`}
          >
            <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
            Data refresh overdue
          </span>
        )}
        {manifest && manifest.states.length > 1 && (
          <StateSelector manifest={manifest} currentState={state} />
        )}
        <WorkspaceSwitcher />
      </div>
    </nav>
  );
}
