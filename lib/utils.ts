import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind classes safely */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Lowercase USPS state code -> full display name, e.g. "fl" -> "Florida".
 * Mirrors public/data/states.json's `name` field. Kept as a static map
 * (rather than reading the manifest) so it's usable from non-React modules
 * like lib/export.ts without an async fetch. Falls back to the uppercased
 * code for any state not yet in the list.
 */
const STATE_CODE_TO_NAME: Record<string, string> = {
  fl: "Florida",
  ca: "California",
  tx: "Texas",
};

/** Format a lowercase USPS state code for display, e.g. "fl" -> "Florida" */
export function formatStateCode(code: string | null | undefined): string {
  if (!code) return "";
  return STATE_CODE_TO_NAME[code.toLowerCase()] ?? code.toUpperCase();
}

/** Format a dollar amount for display */
export function formatDollars(value: number | null | undefined): string {
  if (value == null) return "—";
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toLocaleString()}`;
}

/** Format a large number for display */
export function formatNumber(value: number | null | undefined): string {
  if (value == null) return "—";
  return value.toLocaleString();
}

/** Format a percentage */
export function formatPercent(value: number | null | undefined): string {
  if (value == null) return "—";
  return `${value.toFixed(1)}%`;
}

/** Normalize a string for matching (lowercase, trim) */
export function normalize(s: string): string {
  return s.toLowerCase().trim();
}

/** Return the gap label for a null field */
export function gapLabel(reason: "unknown" | "unavailable" | "not_applicable"): string {
  switch (reason) {
    case "unknown":
      return "Unknown";
    case "unavailable":
      return "Unavailable";
    case "not_applicable":
      return "N/A";
  }
}

// ─── Data Freshness (SPEC_V3 §3.2) ───────────────────────────────

/** Number of days after which pipeline data is considered stale (13 months). */
export const STALENESS_THRESHOLD_DAYS = 395;

/** Number of whole days elapsed between `dateStr` (YYYY-MM-DD) and now. */
export function daysSince(dateStr: string): number {
  const then = new Date(dateStr).getTime();
  if (Number.isNaN(then)) return 0;
  const now = Date.now();
  return Math.floor((now - then) / (1000 * 60 * 60 * 24));
}

/** Whether `dateStr` (YYYY-MM-DD) is older than STALENESS_THRESHOLD_DAYS. */
export function isStale(dateStr: string | null | undefined): boolean {
  if (!dateStr || dateStr === "pending") return false;
  return daysSince(dateStr) > STALENESS_THRESHOLD_DAYS;
}
