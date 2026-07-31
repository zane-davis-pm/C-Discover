"use client";

// ============================================================
// C-Discover — Interactive Florida Map
// V2-T-31, V2-T-33, V2-T-34, V2-T-35: SPEC_V2.md §5
//
// MUST be loaded via Next.js dynamic() with ssr: false:
// const MapView = dynamic(() => import('@/components/map/MapView'), { ssr: false })
//
// Entity modes:
// counties — county choropleth (default)
// municipalities — municipality choropleth; county outlines only
// ============================================================

import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";

import { ChoroplethLayer } from "@/components/map/ChoroplethLayer";
import { MuniLayer } from "@/components/map/MuniLayer";
import { EntityDeepDiveModal } from "@/components/explore/EntityDeepDiveModal";
import { buildChoroplethScale, type QuantileBucket } from "@/lib/choropleth";
import {
  loadCounties,
  loadMunicipalities,
  loadCountiesGeo,
  loadMunicipalitiesGeo,
  loadStateConfig,
} from "@/lib/data";
import type {
  AnyEntity,
  County,
  Municipality,
  CountyMetric,
  MapEntity,
} from "@/lib/types";

// ─── Default bounds (fallback while state config loads) ───────
const FALLBACK_CENTER: [number, number] = [27.8, -81.5];
const FALLBACK_ZOOM = 7;

// ─── CartoDB Positron tiles (clean light-gray basemap) ───────
const OSM_URL =
  "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

// ─── Props ────────────────────────────────────────────────────

interface MapViewProps {
  state: string;
  metric: CountyMetric;
  entity: MapEntity;
  /** Notifies the parent of the active legend buckets (rendered in the toolbar, not on the map). */
  onBucketsChange?: (buckets: QuantileBucket[]) => void;
}

// ─── Component ───────────────────────────────────────────────

export default function MapView({
  state,
  metric,
  entity,
  onBucketsChange,
}: MapViewProps) {
  const [counties, setCounties] = useState<County[]>([]);
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [countyGeo, setCountyGeo] = useState<GeoJSON.FeatureCollection | null>(
    null,
  );
  const [muniGeo, setMuniGeo] = useState<GeoJSON.FeatureCollection | null>(
    null,
  );
  // null until the state's config has loaded. MapContainer only reads
  // center/zoom at mount, so we must NOT mount it on a fallback view and
  // update later — the update is silently ignored and every state's map
  // would open on the fallback (Florida) bounds.
  const [mapCenter, setMapCenter] = useState<[number, number] | null>(null);
  const [mapZoom, setMapZoom] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  // Deep dive opened from a map popup — rendered in place (Radix portals to
  // <body>), so clicking "Deep dive" never navigates away from the map.
  const [deepDiveEntity, setDeepDiveEntity] = useState<AnyEntity | null>(null);

  useEffect(() => {
    // Reset so the map unmounts until the NEW state's bounds are known
    // (prevents a stale-center mount when switching states).
    setMapCenter(null);
    setMapZoom(null);
    setLoading(true);
    Promise.all([
      loadCounties(state),
      loadMunicipalities(state),
      loadCountiesGeo(state),
      loadMunicipalitiesGeo(state),
      loadStateConfig(state),
    ])
      .then(([c, m, cGeo, mGeo, config]) => {
        setCounties(c);
        setMunicipalities(m);
        setCountyGeo(cGeo);
        setMuniGeo(mGeo);
        setMapCenter(config?.map.center ?? FALLBACK_CENTER);
        setMapZoom(config?.map.zoom ?? FALLBACK_ZOOM);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [state]);

  // Build the active scale — municipalities mode uses municipality data
  // Memoized so the reference is stable across renders unless the
  // underlying data/metric/entity actually change (avoids re-triggering
  // the onBucketsChange effect below on every render).
  const activeScale = useMemo(
    () =>
      entity === "municipalities" && municipalities.length > 0
        ? buildChoroplethScale(municipalities, metric)
        : counties.length > 0
          ? buildChoroplethScale(counties, metric)
          : null,
    [entity, municipalities, counties, metric],
  );

  // Legend now renders inline in the page toolbar, not as a map overlay.
  useEffect(() => {
    onBucketsChange?.(activeScale?.buckets ?? []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeScale]);

  return (
    <div className="relative w-full h-full">
      {loading && (
        <div className="absolute inset-0 z-[2000] flex items-center justify-center bg-white bg-opacity-60">
          <div className="flex flex-col items-center gap-2 text-sm text-gray-500">
            <div className="h-6 w-6 rounded-full border-2 border-brand-500 border-t-transparent" />
            Loading map data…
          </div>
        </div>
      )}

      {mapCenter !== null && mapZoom !== null && (
      <MapContainer
        key={state} // remount on state switch so center/zoom re-apply
        center={mapCenter}
        zoom={mapZoom}
        className="w-full h-full"
        style={{ zIndex: 0 }}
        scrollWheelZoom
      >
        <TileLayer url={OSM_URL} attribution={OSM_ATTRIBUTION} />

        {/* County layer — choropleth in Counties mode; outline-only in Municipalities mode (V2-MAP-02, V2-MAP-03) */}
        {countyGeo && counties.length > 0 && (
          <ChoroplethLayer
            geojson={countyGeo}
            counties={counties}
            metric={metric}
            outlineOnly={entity === "municipalities"}
            onDeepDive={setDeepDiveEntity}
          />
        )}

        {/* Municipality layer — visible only in Municipalities mode, no zoom gate (V2-MAP-03, V2-MAP-09) */}
        {entity === "municipalities" &&
          muniGeo &&
          municipalities.length > 0 && (
            <MuniLayer
              geojson={muniGeo}
              municipalities={municipalities}
              metric={metric}
              onDeepDive={setDeepDiveEntity}
            />
          )}
      </MapContainer>
      )}

      {/* Deep dive overlay — opened from a county/municipality popup */}
      <EntityDeepDiveModal
        entity={deepDiveEntity}
        open={deepDiveEntity !== null}
        onClose={() => setDeepDiveEntity(null)}
      />
    </div>
  );
}
