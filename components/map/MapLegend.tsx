"use client";

// ============================================================
// C-Discover — Map Legend
// V2-T-35: SPEC_V2.md §5.4
//
// Compact, inline gradient-bar legend with min/max labels.
// Entity-aware: shows the correct label for the active mode.
// Designed to sit inline in the map toolbar rather than as a
// floating overlay on the map itself.
// ============================================================

import type { QuantileBucket } from "@/lib/choropleth";
import type { CountyMetric, MapEntity } from "@/lib/types";
import { COUNTY_METRIC_LABELS, MUNICIPALITY_METRIC_LABELS } from "@/lib/types";
import { NULL_COLOR } from "@/lib/choropleth";

interface MapLegendProps {
  metric: CountyMetric;
  entity: MapEntity;
  buckets: QuantileBucket[];
  className?: string;
}

export function MapLegend({
  metric,
  entity,
  buckets,
  className = "",
}: MapLegendProps) {
  const label =
    entity === "municipalities"
      ? MUNICIPALITY_METRIC_LABELS[metric]
      : COUNTY_METRIC_LABELS[metric];

  if (buckets.length === 0) return null;

  // Build gradient from bucket colors (low → high)
  const gradientColors = buckets.map((b) => b.color).join(",");
  const gradient = `linear-gradient(to right, ${gradientColors})`;

  const minLabel = buckets[0].label.split("–")[0].trim();
  const maxLabel =
    buckets[buckets.length - 1].label.split("–")[1]?.trim() ?? "";

  return (
    <div
      className={`flex items-center gap-2 ${className}`}
      title={label}
    >
      <span className="text-[11px] font-medium text-gray-500 whitespace-nowrap hidden md:inline">
        {label}
      </span>

      <span className="text-[10px] text-gray-400 tabular-nums">
        {minLabel}
      </span>

      {/* Gradient bar */}
      <div
        className="h-1.5 w-16 rounded-full border border-gray-100 flex-shrink-0"
        style={{ background: gradient }}
      />

      <span className="text-[10px] text-gray-400 tabular-nums">
        {maxLabel}
      </span>

      {/* No-data swatch */}
      <span
        className="inline-block h-2 w-2 rounded-sm border border-gray-200 flex-shrink-0 ml-1"
        style={{ backgroundColor: NULL_COLOR }}
        aria-hidden
      />
      <span className="text-[10px] text-gray-400 whitespace-nowrap">
        No data
      </span>
    </div>
  );
}
