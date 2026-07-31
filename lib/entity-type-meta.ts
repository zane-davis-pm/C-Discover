// ============================================================
// C-Discover — Entity Type Metadata
// Shared mapping between EntityType, its explore-page path, and its
// display labels. Used by CompareBar, ExploreLayout, and /compare.
// ============================================================

import type { EntityType } from "@/lib/types";

/** Explore-page URL segment for each entity type, WITHOUT the state prefix. */
export const ENTITY_TYPE_EXPLORE_SEGMENT: Record<EntityType, string> = {
  county: "counties",
  municipality: "municipalities",
  school_district: "school-districts",
  special_district: "special-districts",
};

/**
 * Build the state-prefixed explore path for an entity type, e.g.
 * entityTypeExplorePath("fl", "county") -> "/fl/explore/counties".
 * Phase 3 (PROJECT_PLAN_MULTISTATE.md §3.2): every explore link must be
 * state-prefixed — never hardcode "/explore/..." directly.
 */
export function entityTypeExplorePath(state: string, type: EntityType): string {
  return `/${state}/explore/${ENTITY_TYPE_EXPLORE_SEGMENT[type]}`;
}

/** Maps the explore-page URL segment (e.g. "school-districts") back to its EntityType. */
export const EXPLORE_SEGMENT_TO_ENTITY_TYPE: Record<string, EntityType> = {
  counties: "county",
  municipalities: "municipality",
  "school-districts": "school_district",
  "special-districts": "special_district",
};

export const ENTITY_TYPE_LABEL_PLURAL: Record<EntityType, string> = {
  county: "Counties",
  municipality: "Municipalities",
  school_district: "School Districts",
  special_district: "Special Districts",
};

export const ENTITY_TYPE_LABEL_SINGULAR: Record<EntityType, string> = {
  county: "County",
  municipality: "Municipality",
  school_district: "School District",
  special_district: "Special District",
};

/**
 * States whose source data has essentially no populated official-website
 * links for municipalities, counties, school districts, or special
 * districts. Website links/columns should be hidden for these states
 * rather than showing rows of "Unknown"/"Unavailable" gaps. Florida is
 * excluded — its website field is mostly populated.
 */
const STATES_WITHOUT_WEBSITE_LINKS = new Set(["ca", "tx"]);

/** True if website links should be hidden in the UI for this state code. */
export function stateHasNoWebsiteLinks(state: string): boolean {
  return STATES_WITHOUT_WEBSITE_LINKS.has(state.toLowerCase());
}
