"use client";

// ============================================================
// C-Discover — Map Page
// V2-T-31, V2-T-32: SPEC_V2.md §5.4
//
// URL params:
// ?metric=population|median_hh_income|total_revenue|pct_bachelors_plus|population_growth_rate
// ?entity=counties|municipalities
//
// Metric dropdown and entity mode selector both update URL state.
// Phase 3 (PROJECT_PLAN_MULTISTATE.md §3.2): state-scoped — map center/
// zoom and entity data come from the state's loaded config, not a
// hardcoded Florida constant.
// ============================================================

import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState, useTransition } from "react";
import { Map as MapIcon } from "lucide-react";

import type { CountyMetric, MapEntity, StateConfig } from "@/lib/types";
import { COUNTY_METRIC_LABELS } from "@/lib/types";
import { paramsToMapState, mapStateToParams } from "@/lib/url-state";
import { loadStateConfig } from "@/lib/data";
import { MapLegend } from "@/components/map/MapLegend";
import type { QuantileBucket } from "@/lib/choropleth";

// Dynamic import — MUST have ssr: false for Leaflet
const MapView = dynamic(() => import("@/components/map/MapView"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gray-50 text-sm text-gray-400">
      <div className="flex flex-col items-center gap-2">
        <div className="h-6 w-6 rounded-full border-2 border-brand-500 border-t-transparent" />
        Loading map…
      </div>
    </div>
  ),
});

const METRIC_OPTIONS: CountyMetric[] = [
  "population",
  "median_hh_income",
  "total_revenue",
  "pct_bachelors_plus",
  "population_growth_rate",
];

// ─── Inner component (needs useSearchParams) ─────────────────

function MapPageInner({ state }: { state: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [stateConfig, setStateConfig] = useState<StateConfig | null>(null);
  const [buckets, setBuckets] = useState<QuantileBucket[]>([]);
  const handleBucketsChange = useCallback(
    (next: QuantileBucket[]) => setBuckets(next),
    [],
  );

  useEffect(() => {
    loadStateConfig(state).then(setStateConfig);
  }, [state]);

  // Read URL state
  const { metric, entity } = paramsToMapState(searchParams);

  // Update URL param(s) from a new MapState
  const setMapState = useCallback(
    (next: { metric?: CountyMetric; entity?: MapEntity }) => {
      startTransition(() => {
        const newState = {
          metric: next.metric ?? metric,
          entity: next.entity ?? entity,
        };
        const params = mapStateToParams(newState);
        const qs = params.toString();
        router.replace(`/${state}/map${qs ? `?${qs}` : ""}`, {
          scroll: false,
        });
      });
    },
    [router, metric, entity, state],
  );

  const handleMetricChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setMapState({ metric: e.target.value as CountyMetric });
  };

  const handleEntityChange = (next: MapEntity) => {
    setMapState({ entity: next });
  };

  const stateName = stateConfig?.name ?? state.toUpperCase();

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      {/* ── Toolbar ── */}
      <div className="flex items-center gap-4 px-4 py-2 bg-white border-b border-gray-200 shadow-sm z-10 flex-shrink-0 flex-wrap">
        <div className="flex items-center gap-1.5 text-gray-500">
          <MapIcon className="h-4 w-4" />
          <span className="text-sm font-medium text-gray-700">
            {stateName} Map
          </span>
        </div>

        {/* Metric selector */}
        <div className="flex items-center gap-2 ml-2">
          <label
            htmlFor="map-metric-select"
            className="text-xs font-medium text-gray-500 whitespace-nowrap"
          >
            Choropleth metric
          </label>
          <select
            id="map-metric-select"
            value={metric}
            onChange={handleMetricChange}
            className="text-sm border border-gray-300 rounded-md px-2 py-1 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
          >
            {METRIC_OPTIONS.map((m) => (
              <option key={m} value={m}>
                {COUNTY_METRIC_LABELS[m]}
              </option>
            ))}
          </select>
        </div>

        {/* Entity mode — segmented control (V2-MAP-01) */}
        <div
          className="flex items-center ml-2 rounded-md border border-gray-300 overflow-hidden"
          role="group"
          aria-label="Map entity mode"
        >
          {(["counties", "municipalities"] as MapEntity[]).map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => handleEntityChange(e)}
              aria-pressed={entity === e}
              className={`px-3 py-1 text-sm font-medium capitalize ${
                entity === e
                  ? "bg-brand-600 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              {e}
            </button>
          ))}
        </div>

        {/* Legend — entity-aware, inline in the toolbar (V2-MAP-05) */}
        {buckets.length > 0 && (
          <MapLegend
            metric={metric}
            entity={entity}
            buckets={buckets}
            className="ml-2 pl-2 border-l border-gray-200"
          />
        )}

        <p className="ml-auto text-xs text-gray-400 hidden lg:block">
          Click any {entity === "municipalities" ? "municipality" : "county"}{" "}
          for details
        </p>
      </div>

      {/* ── Map ── */}
      <div className="flex-1 relative">
        <MapView
          state={state}
          metric={metric}
          entity={entity}
          onBucketsChange={handleBucketsChange}
        />
      </div>
    </div>
  );
}

// ─── Page export (Suspense boundary for useSearchParams) ──────

export default function MapPage({ params }: { params: { state: string } }) {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-[calc(100vh-3.5rem)] text-sm text-gray-400">
          Loading…
        </div>
      }
    >
      <MapPageInner state={params.state} />
    </Suspense>
  );
}
