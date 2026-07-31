// ============================================================
// C-Discover — Deep Dive Data Loaders
// All data is pre-built static JSON in /public/data/{state}/deep-dive/.
// DO NOT add runtime API calls. See SPEC_DEEP_DIVE_DASHBOARD.md §3.3.
// ============================================================

import type {
  AnyDeepDive,
  CountyDeepDive,
  DeepDiveEntityType,
  DeepDiveIndex,
  MunicipalityDeepDive,
  SchoolDistrictDeepDive,
  SpecialDistrictDeepDive,
} from "@/lib/types";
import { entityTypeExplorePath } from "@/lib/entity-type-meta";

async function loadJsonOrNull<T>(path: string): Promise<T | null> {
  const res = await fetch(path, { cache: "no-store" });
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`Failed to load ${path}: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

const FOLDER_BY_TYPE: Record<DeepDiveEntityType, string> = {
  county: "counties",
  municipality: "municipalities",
  school_district: "school-districts",
  special_district: "special-districts",
};

export function loadCountyDeepDive(
  state: string,
  id: string
): Promise<CountyDeepDive | null> {
  return loadJsonOrNull<CountyDeepDive>(
    `/data/${state}/deep-dive/counties/${id}.json`
  );
}

export function loadMunicipalityDeepDive(
  state: string,
  id: string
): Promise<MunicipalityDeepDive | null> {
  return loadJsonOrNull<MunicipalityDeepDive>(
    `/data/${state}/deep-dive/municipalities/${id}.json`
  );
}

export function loadSchoolDistrictDeepDive(
  state: string,
  id: string
): Promise<SchoolDistrictDeepDive | null> {
  return loadJsonOrNull<SchoolDistrictDeepDive>(
    `/data/${state}/deep-dive/school-districts/${id}.json`
  );
}

export function loadSpecialDistrictDeepDive(
  state: string,
  id: string
): Promise<SpecialDistrictDeepDive | null> {
  return loadJsonOrNull<SpecialDistrictDeepDive>(
    `/data/${state}/deep-dive/special-districts/${id}.json`
  );
}

/** Generic loader keyed by the route's [type] segment. */
export function loadDeepDive(
  state: string,
  type: DeepDiveEntityType,
  id: string
): Promise<AnyDeepDive | null> {
  const folder = FOLDER_BY_TYPE[type];
  if (!folder) return Promise.resolve(null);
  return loadJsonOrNull<AnyDeepDive>(
    `/data/${state}/deep-dive/${folder}/${id}.json`
  );
}

export function loadDeepDiveIndex(state: string): Promise<DeepDiveIndex | null> {
  return loadJsonOrNull<DeepDiveIndex>(`/data/${state}/deep-dive/index.json`);
}

/** Maps the app's EntityType (types.ts) → the deep-dive route [type] segment. */
export function deepDiveRouteType(type: string): DeepDiveEntityType | null {
  switch (type) {
    case "county":
      return "county";
    case "municipality":
      return "municipality";
    case "school_district":
      return "school_district";
    case "special_district":
      return "special_district";
    default:
      return null;
  }
}

/**
 * Builds the state-prefixed explore href that opens the deep-dive overlay
 * for a given entity, e.g. "/ca/explore/counties?dd=county_06001".
 *
 * Links directly to the entity's own state — do NOT route through the
 * legacy /entity/[type]/[id] redirect, which can only assume DEFAULT_STATE
 * and therefore breaks for entities in any other state.
 */
export function deepDiveHref(
  state: string,
  type: string,
  id: string
): string | null {
  const routeType = deepDiveRouteType(type);
  if (!routeType) return null;
  return `${entityTypeExplorePath(state, routeType)}?dd=${encodeURIComponent(id)}`;
}
