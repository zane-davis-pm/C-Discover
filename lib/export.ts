// ============================================================
// C-Discover — CSV Export
// T-60: SPEC.md §9.2 — Column specification for shortlist export
// ============================================================

import Papa from "papaparse";
import type {
  ShortlistItem,
  DataGap,
  EntityNote,
  Workspace,
  WorkspaceExportFile,
} from "@/lib/types";
import { noteKey } from "@/lib/notes";
import { formatStateCode } from "@/lib/utils";

// ─── Helpers ─────────────────────────────────────────────────

/** Return today's date as YYYY-MM-DD */
function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Derive "Dependent" / "Independent" / "" from boolean */
function dependentLabel(val: boolean | null | undefined): string {
  if (val === true) return "Dependent";
  if (val === false) return "Independent";
  return "";
}

/**
 * Format data_gaps for the CSV column.
 * Example: "population (unknown); total_revenue (unavailable)"
 */
function gapsString(gaps: DataGap[]): string {
  if (!gaps || gaps.length === 0) return "";
  return gaps.map((g) => `${g.field} (${g.reason})`).join("; ");
}

/** Dollar amounts written as plain integers per §9.2 */
function intOrEmpty(val: number | null | undefined): string {
  return val != null ? String(Math.round(val)) : "";
}

function numOrEmpty(val: number | null | undefined): string {
  return val != null ? String(val) : "";
}

function strOrEmpty(val: string | null | undefined): string {
  return val ?? "";
}

// ─── Row shape mirrors §9.2 column order exactly ─────────────

interface CsvRow {
  "Entity Type": string;
  Name: string;
  State: string;
  County: string;
  Population: string;
  "Population Year": string;
  "Population Growth Rate (%)": string;
  "Median HH Income": string;
  "% Bachelor's+": string;
  "Poverty Rate": string;
  "Total Revenue": string;
  "Fiscal Year": string;
  "PK-12 Enrollment": string;
  "FTE Enrollment": string;
  "Expenditure per FTE": string;
  "Purpose Category": string;
  "Dependent/Independent": string;
  Website: string;
  "Demographics Source": string;
  "Financials Source": string;
  "Data Gaps": string;
  Notes: string;
}

function itemToRow(
  item: ShortlistItem,
  notes: Record<string, EntityNote>
): CsvRow {
  const s = item.snapshot;
  return {
    "Entity Type": s.type,
    Name: s.name,
    State: formatStateCode(s.state),
    County: s.county,
    Population: intOrEmpty(s.population),
    "Population Year": numOrEmpty(s.population_year),
    "Population Growth Rate (%)": numOrEmpty(s.population_growth_rate),
    "Median HH Income": intOrEmpty(s.median_hh_income),
    "% Bachelor's+": s.pct_bachelors_plus != null ? s.pct_bachelors_plus.toFixed(1) : "",
    "Poverty Rate": s.poverty_rate != null ? s.poverty_rate.toFixed(1) : "",
    "Total Revenue": intOrEmpty(s.total_revenue),
    "Fiscal Year": numOrEmpty(s.fiscal_year),
    "PK-12 Enrollment": intOrEmpty(s.enrollment_pk12),
    "FTE Enrollment": s.enrollment_fte != null ? s.enrollment_fte.toFixed(1) : "",
    "Expenditure per FTE": intOrEmpty(s.expenditure_per_fte),
    "Purpose Category": strOrEmpty(s.purpose_category),
    "Dependent/Independent": dependentLabel(s.dependent),
    Website: strOrEmpty(s.website),
    "Demographics Source": strOrEmpty(s.income_source),
    "Financials Source": strOrEmpty(s.fiscal_source),
    "Data Gaps": gapsString(s.data_gaps),
    Notes: notes[noteKey(item.id, s.state)]?.text ?? "",
  };
}

/**
 * Generate a CSV from shortlist items and trigger a browser download.
 * Filename: c-discover-shortlist-YYYY-MM-DD.csv
 * `notes` (entity notes feature): map keyed by noteKey(id, state);
 * matching notes are written to the trailing "Notes" column.
 */
export function downloadShortlistCsv(
  items: ShortlistItem[],
  notes: Record<string, EntityNote> = {}
): void {
  const rows = items.map((item) => itemToRow(item, notes));
  const csv = Papa.unparse(rows, { header: true });
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", `c-discover-shortlist-${todayIso()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ============================================================
// V3-T-44 / V3-T-45 — Workspace JSON export/import
// SPEC_V3.md §6.3, §7.2. Separate from the CSV export above,
// which remains the spreadsheet-friendly path. JSON export is
// the manual, static-architecture-compatible answer to "shared"
// workspaces (V3-W-03/04/05) — a point-in-time snapshot, not a
// live sync.
// ============================================================

/** Turn a workspace name into a filesystem-safe slug for the download filename. */
function slugify(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "workspace";
}

/**
 * Serialize a workspace to a WorkspaceExportFile and trigger a browser
 * download. Filename: c-discover-workspace-<slug>-YYYY-MM-DD.json
 */
export function downloadWorkspaceJson(file: WorkspaceExportFile): void {
  const json = JSON.stringify(file, null, 2);
  const blob = new Blob([json], { type: "application/json;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute(
    "download",
    `c-discover-workspace-${slugify(file.workspace.name)}-${todayIso()}.json`
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Parse and validate a File as a WorkspaceExportFile. Throws a
 * human-readable Error on malformed input so callers can surface it
 * directly to the user.
 */
export async function parseWorkspaceJsonFile(file: File): Promise<WorkspaceExportFile> {
  let raw: unknown;
  try {
    const text = await file.text();
    raw = JSON.parse(text);
  } catch {
    throw new Error("That file isn't valid JSON.");
  }

  const candidate = raw as Partial<WorkspaceExportFile> | null;
  if (
    !candidate ||
    typeof candidate !== "object" ||
    // v1 = pre-notes exports, v2 = adds optional `notes` — both importable.
    (candidate.format_version !== 1 && candidate.format_version !== 2) ||
    !candidate.workspace ||
    typeof candidate.workspace !== "object"
  ) {
    throw new Error("That file isn't a C-Discover workspace export.");
  }

  if (
    candidate.notes != null &&
    (typeof candidate.notes !== "object" || Array.isArray(candidate.notes))
  ) {
    throw new Error("The workspace file has a malformed notes section.");
  }

  const workspace = candidate.workspace as Partial<Workspace>;
  if (
    typeof workspace.name !== "string" ||
    !Array.isArray(workspace.items) ||
    !Array.isArray(workspace.tags)
  ) {
    throw new Error("The workspace file is missing required fields.");
  }

  return candidate as WorkspaceExportFile;
}
