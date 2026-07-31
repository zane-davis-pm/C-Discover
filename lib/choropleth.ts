// ============================================================
// C-Discover — Choropleth Color Scale
// T-50: SPEC.md §8.3
//
// Produces a 5-step quantile color scale using chroma-js.
// Null-value counties always receive GRAY_HEX.
// Scale computed across non-null values only.
// ============================================================

import chroma from "chroma-js";
import type { County, Municipality, CountyMetric, MunicipalityMetric } from "@/lib/types";

/** Color for counties with a null value for the selected metric. */
export const NULL_COLOR = "#e5e7eb"; // Tailwind gray-200

/**
 * 5-step sequential blue scale for choropleth fill.
 * Low values → light; high values → dark.
 */
const SCALE_COLORS = [
  "#dbeafe", // blue-100
  "#93c5fd", // blue-300
  "#3b82f6", // blue-500
  "#1d4ed8", // blue-700
  "#1e3a8a", // blue-900
];

export interface QuantileBucket {
  min: number;
  max: number;
  color: string;
  label: string; // formatted range label e.g. "50,000 – 100,000"
}

export interface ChoroplethScale {
  /** Returns the hex color for a given value (null → NULL_COLOR). */
  colorFor: (value: number | null | undefined) => string;
  /** 5 buckets describing the legend. */
  buckets: QuantileBucket[];
  /** The metric this scale was computed for. */
  metric: CountyMetric | MunicipalityMetric;
}

// ─── Formatters ──────────────────────────────────────────────

function formatValue(value: number, metric: CountyMetric | MunicipalityMetric): string {
  if (
    metric === "median_hh_income" ||
    metric === "total_revenue"
  ) {
    if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(0)}M`;
    if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
    return `$${value.toLocaleString()}`;
  }
  if (metric === "pct_bachelors_plus") {
    return `${value.toFixed(1)}%`;
  }
  if (metric === "population_growth_rate") {
    return `${value.toFixed(2)}%`;
  }
  // population
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return value.toLocaleString();
}

// ─── Scale Builder ────────────────────────────────────────────

/**
 * Build a quantile choropleth scale for the given metric across
 * any array of entities (County[] or Municipality[]). Non-null values
 * are sorted and divided into 5 equal-count buckets (quantiles).
 *
 * If fewer than 5 non-null values exist, returns a flat scale.
 */
export function buildChoroplethScale(
  items: County[] | Municipality[],
  metric: CountyMetric | MunicipalityMetric
): ChoroplethScale {
  // Extract non-null numeric values
  const values: number[] = (items as unknown as Array<Record<string, unknown>>)
    .map((c) => c[metric] as number | null)
    .filter((v): v is number => v !== null && v !== undefined && !Number.isNaN(v))
    .sort((a, b) => a - b);

  if (values.length === 0) {
    // Degenerate: no data at all
    return {
      metric,
      colorFor: () => NULL_COLOR,
      buckets: [],
    };
  }

  const scale = chroma.scale(SCALE_COLORS).classes(5);

  // Quantile breaks: evenly divide sorted values into 5 groups
  const n = values.length;
  const breakIndices = [0, 1, 2, 3, 4].map((i) =>
    Math.floor((i * n) / 5)
  );
  const breaks = breakIndices.map((i) => values[i]);
  const maxVal = values[n - 1];

  // Build 5 bucket descriptors
  const buckets: QuantileBucket[] = breaks.map((breakMin, i) => {
    const breakMax = i < 4 ? values[breakIndices[i + 1] - 1] ?? maxVal : maxVal;
    const color = SCALE_COLORS[i];
    return {
      min: breakMin,
      max: breakMax,
      color,
      label: `${formatValue(breakMin, metric)} – ${formatValue(breakMax, metric)}`,
    };
  });

  const chromaScale = chroma
    .scale(SCALE_COLORS)
    .domain([values[0], maxVal])
    .mode("lab");

  function colorFor(value: number | null | undefined): string {
    if (value === null || value === undefined || Number.isNaN(value)) {
      return NULL_COLOR;
    }
    return chromaScale(value).hex();
  }

  return { metric, colorFor, buckets };
}
