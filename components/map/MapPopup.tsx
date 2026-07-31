"use client";

// ============================================================
// C-Discover — Map Popup Content
// V2-T-36, V2-T-37: SPEC_V2.md §5.2, §5.4
//
// CountyPopupContent: county click popup
// MuniPopupContent: municipality click popup
//
// Both share MapPopupShell: a ~300px card with a 2-column metric
// grid (label stacked above value) and exactly two actions —
// "Deep dive" (primary) and "Add to shortlist" (secondary toggle).
//
// NOTE: These are plain React components rendered into Leaflet
// popups via ReactDOM.createRoot — not inside react-leaflet. They
// must therefore not depend on React context from the app tree.
// ============================================================

import { BarChart3, Bookmark, BookmarkX } from "lucide-react";

import type { County, Municipality } from "@/lib/types";
import type { CountyMetric, MunicipalityMetric } from "@/lib/types";
import { COUNTY_METRIC_LABELS, MUNICIPALITY_METRIC_LABELS } from "@/lib/types";

// ─── Formatters ──────────────────────────────────────────────

function fmtPop(v: number | null): string {
  if (v === null) return "Unknown";
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
  return v.toLocaleString();
}

function fmtMoney(v: number | null): string {
  if (v === null) return "Unavailable";
  if (v >= 1_000_000_000) return `$${(v / 1_000_000_000).toFixed(1)}B`;
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(0)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v.toLocaleString()}`;
}

function fmtPct(v: number | null): string {
  if (v === null) return "Unknown";
  return `${v.toFixed(1)}%`;
}

function fmtGrowth(v: number | null): string {
  if (v === null) return "Unknown";
  return `${v.toFixed(2)}%`;
}

function fmtMetricValue(
  value: number | null,
  metric: CountyMetric | MunicipalityMetric
): string {
  if (value === null) return "Unknown";
  if (metric === "median_hh_income" || metric === "total_revenue") {
    return fmtMoney(value);
  }
  if (metric === "pct_bachelors_plus") {
    return `${value.toFixed(1)}%`;
  }
  if (metric === "population_growth_rate") {
    return fmtGrowth(value);
  }
  return fmtPop(value);
}

// ─── Shared shell ─────────────────────────────────────────────

interface MetricCell {
  key: string;
  label: string;
  value: string;
}

interface MapPopupShellProps {
  title: string;
  subtitle: string;
  /** Full-width highlighted tile above the grid (the active choropleth metric). */
  highlight?: MetricCell;
  cells: MetricCell[];
  inShortlist: boolean;
  onDeepDive: () => void;
  onToggleShortlist: () => void;
}

function MapPopupShell({
  title,
  subtitle,
  highlight,
  cells,
  inShortlist,
  onDeepDive,
  onToggleShortlist,
}: MapPopupShellProps) {
  return (
    <div className="w-[300px] font-sans">
      {/* Header */}
      <div className="pr-6">
        <p className="text-[15px] font-semibold leading-tight text-gray-900">
          {title}
        </p>
        <p className="mt-0.5 text-[11px] uppercase tracking-wide text-gray-400">
          {subtitle}
        </p>
      </div>

      {/* Active metric — highlighted, spans full width */}
      {highlight && (
        <div className="mt-3 flex items-baseline justify-between gap-3 rounded-md bg-brand-50 px-3 py-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-brand-700">
            {highlight.label}
          </span>
          <span className="text-[15px] font-bold leading-none text-brand-800">
            {highlight.value}
          </span>
        </div>
      )}

      {/* Metric grid — label stacked above value, two per row */}
      {cells.length > 0 && (
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2.5">
          {cells.map((cell) => (
            <div key={cell.key} className="min-w-0">
              <dt className="truncate text-[10px] uppercase tracking-wide text-gray-400">
                {cell.label}
              </dt>
              <dd className="mt-0.5 truncate text-[13px] font-semibold text-gray-800">
                {cell.value}
              </dd>
            </div>
          ))}
        </dl>
      )}

      {/* Actions — two equal-width buttons */}
      <div className="mt-3.5 grid grid-cols-2 gap-2 border-t border-gray-100 pt-3">
        <button
          type="button"
          onClick={onDeepDive}
          aria-label={`Open deep dive for ${title}`}
          className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md bg-brand-800 px-2 text-xs font-semibold text-white transition-colors hover:bg-brand-900"
        >
          <BarChart3 className="h-3.5 w-3.5" />
          Deep dive
        </button>
        <button
          type="button"
          onClick={onToggleShortlist}
          aria-label={
            inShortlist
              ? `Remove ${title} from shortlist`
              : `Add ${title} to shortlist`
          }
          className={`inline-flex h-8 items-center justify-center gap-1.5 rounded-md border px-2 text-xs font-semibold transition-colors ${
            inShortlist
              ? "border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
              : "border-gray-300 bg-white text-gray-700 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-800"
          }`}
        >
          {inShortlist ? (
            <>
              <BookmarkX className="h-3.5 w-3.5" />
              Remove
            </>
          ) : (
            <>
              <Bookmark className="h-3.5 w-3.5" />
              Add to shortlist
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ─── County Popup ─────────────────────────────────────────────

interface CountyPopupProps {
  county: County;
  metric: CountyMetric;
  inShortlist: boolean;
  onDeepDive: (county: County) => void;
  onToggleShortlist: (county: County) => void;
}

export function CountyPopupContent({
  county,
  metric,
  inShortlist,
  onDeepDive,
  onToggleShortlist,
}: CountyPopupProps) {
  const metricValue = county[metric] as number | null;

  // Supplemental cells — skip any that duplicate the highlighted metric
  const allCells: (MetricCell & { key: CountyMetric })[] = [
    { key: "population", label: "Population", value: fmtPop(county.population) },
    {
      key: "median_hh_income",
      label: "Median HH Inc.",
      value: fmtMoney(county.median_hh_income),
    },
    {
      key: "total_revenue",
      label: "Total Revenue",
      value: fmtMoney(county.total_revenue),
    },
    {
      key: "pct_bachelors_plus",
      label: "Bachelor's+",
      value: fmtPct(county.pct_bachelors_plus),
    },
    {
      key: "population_growth_rate",
      label: "Pop. Growth Rate",
      value: fmtGrowth(county.population_growth_rate),
    },
  ];
  const cells = allCells.filter((cell) => cell.key !== metric);

  return (
    <MapPopupShell
      title={county.name}
      subtitle={county.county_seat ? `County · Seat: ${county.county_seat}` : "County"}
      highlight={{
        key: metric,
        label: COUNTY_METRIC_LABELS[metric],
        value: fmtMetricValue(metricValue, metric),
      }}
      cells={cells}
      inShortlist={inShortlist}
      onDeepDive={() => onDeepDive(county)}
      onToggleShortlist={() => onToggleShortlist(county)}
    />
  );
}

// ─── Municipality Popup ───────────────────────────────────────
// V2-MAP-06, V2-MAP-07: full data + shortlist button

interface MuniPopupProps {
  municipality: Municipality;
  /** Active choropleth metric — highlighted above the rest of the grid, same as CountyPopupContent. */
  metric?: MunicipalityMetric;
  inShortlist: boolean;
  onDeepDive: (municipality: Municipality) => void;
  onToggleShortlist: () => void;
}

export function MuniPopupContent({
  municipality,
  metric,
  inShortlist,
  onDeepDive,
  onToggleShortlist,
}: MuniPopupProps) {
  const m = municipality;

  const allCells: (MetricCell & { key: MunicipalityMetric })[] = [
    { key: "population", label: "Population", value: fmtPop(m.population) },
    {
      key: "median_hh_income",
      label: "Median HH Inc.",
      value: fmtMoney(m.median_hh_income),
    },
    {
      key: "total_revenue",
      label: "Total Revenue",
      value: fmtMoney(m.total_revenue),
    },
    {
      key: "pct_bachelors_plus",
      label: "Bachelor's+",
      value: fmtPct(m.pct_bachelors_plus),
    },
    {
      key: "population_growth_rate",
      label: "Pop. Growth Rate",
      value: fmtGrowth(m.population_growth_rate),
    },
  ];
  const cells = metric
    ? allCells.filter((cell) => cell.key !== metric)
    : allCells;
  const highlight = metric
    ? {
        key: metric,
        label: MUNICIPALITY_METRIC_LABELS[metric],
        value: fmtMetricValue(m[metric] as number | null, metric),
      }
    : undefined;

  return (
    <MapPopupShell
      title={m.name}
      subtitle={`${m.entity_subtype} · ${m.county} County`}
      highlight={highlight}
      cells={cells}
      inShortlist={inShortlist}
      onDeepDive={() => onDeepDive(m)}
      onToggleShortlist={onToggleShortlist}
    />
  );
}
