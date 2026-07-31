"use client";

// ============================================================
// C-Discover — Municipality Choropleth Layer
// V2-T-34, V2-T-36, V2-T-37: SPEC_V2.md §5.3, §5.4
//
// Renders municipality polygons colored by the selected metric.
// No zoom threshold — visible at all zoom levels when active.
// Clicking a municipality opens a popup with full data + shortlist.
// ============================================================

import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import * as L from "leaflet";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";

import { MuniPopupContent } from "@/components/map/MapPopup";
import { buildChoroplethScale } from "@/lib/choropleth";
import { useShortlist } from "@/lib/shortlist";
import type { Municipality, MunicipalityMetric } from "@/lib/types";

interface MuniLayerProps {
  geojson: GeoJSON.FeatureCollection;
  municipalities: Municipality[];
  metric: MunicipalityMetric;
  /** Opens the deep-dive overlay for a municipality (handled by MapView). */
  onDeepDive?: (municipality: Municipality) => void;
}

/** Normalize a municipality name for lookup. */
function normalizeName(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/^(city of |town of |village of )/i, "")
    .trim();
}

function buildMuniLookup(munis: Municipality[]): Map<string, Municipality> {
  const map = new Map<string, Municipality>();
  for (const m of munis) {
    map.set(normalizeName(m.name), m);
    map.set(m.name.toLowerCase(), m);
    map.set(m.place_fips, m);
  }
  return map;
}

function matchMuni(
  props: Record<string, unknown>,
  lookup: Map<string, Municipality>,
): Municipality | undefined {
  const candidates = [
    props["NAME"],
    props["name"],
    props["place_fips"],
    props["geoid"],
    props["PLACE"],
    props["PLACEFP"],
    props["GEOID"],
  ]
    .filter(Boolean)
    .map(String);

  for (const raw of candidates) {
    const norm = normalizeName(raw);
    if (lookup.has(norm)) return lookup.get(norm);
    if (lookup.has(raw.toLowerCase())) return lookup.get(raw.toLowerCase());
    if (lookup.has(raw)) return lookup.get(raw);
  }
  return undefined;
}

export function MuniLayer({
  geojson,
  municipalities,
  metric,
  onDeepDive,
}: MuniLayerProps) {
  const map = useMap();
  const layerRef = useRef<L.GeoJSON | null>(null);
  const { add, remove, has } = useShortlist();

  // Popup content is rendered outside the React tree (createRoot), so the
  // click handler would otherwise capture a stale callback. Keeping it in a
  // ref lets the handler stay current without rebuilding the whole layer.
  const onDeepDiveRef = useRef(onDeepDive);
  onDeepDiveRef.current = onDeepDive;

  useEffect(() => {
    if (!geojson || !municipalities.length) return;

    if (layerRef.current) {
      layerRef.current.remove();
      layerRef.current = null;
    }

    const lookup = buildMuniLookup(municipalities);
    const scale = buildChoroplethScale(municipalities, metric);

    const layer = L.geoJSON(geojson, {
      style: (feature) => {
        const props = (feature?.properties ?? {}) as Record<string, unknown>;
        const muni = matchMuni(props, lookup);
        const value = muni ? (muni[metric] as number | null) : null;
        const fillColor = scale.colorFor(value);

        return {
          fillColor,
          fillOpacity: 0.75,
          color: "#ffffff",
          weight: 0.8,
          opacity: 0.9,
        };
      },
      onEachFeature: (feature, featureLayer) => {
        const props = (feature?.properties ?? {}) as Record<string, unknown>;
        const muni = matchMuni(props, lookup);
        if (!muni) return;

        featureLayer.on("click", (e: L.LeafletEvent) => {
          L.DomEvent.stopPropagation(e as L.LeafletMouseEvent);

          const container = document.createElement("div");
          const root = createRoot(container);

          const renderPopup = (inShortlist: boolean) => {
            root.render(
              <MuniPopupContent
                municipality={muni}
                metric={metric}
                inShortlist={inShortlist}
                onDeepDive={(m) => {
                  map.closePopup();
                  onDeepDiveRef.current?.(m);
                }}
                onToggleShortlist={() => {
                  if (has(muni.id, muni.state)) {
                    remove(muni.id, muni.state);
                    renderPopup(false);
                  } else {
                    add(muni);
                    renderPopup(true);
                  }
                }}
              />,
            );
          };

          // flushSync ensures React renders content into`container`before
          // Leaflet measures the popup width for autoPan calculations.
          flushSync(() => renderPopup(has(muni.id, muni.state)));

          L.popup({
            minWidth: 300,
            maxWidth: 340,
            className: "c-discover-popup",
            autoPan: true,
            autoPanPadding: [24, 24],
          })
            .setLatLng((featureLayer as L.Polygon).getBounds().getCenter())
            .setContent(container)
            .openOn(map);
        });

        featureLayer.on("mouseover", function () {
          (featureLayer as L.Path).setStyle({
            fillOpacity: 1,
            weight: 2,
            color: "#ffffff",
            opacity: 1,
          });
          (featureLayer as L.Path).bringToFront();
        });

        featureLayer.on("mouseout", function () {
          layer.resetStyle(featureLayer as L.Path);
        });
      },
    });

    // No zoom threshold — add immediately at all zoom levels (V2-MAP-09)
    layer.addTo(map);
    layerRef.current = layer;

    return () => {
      layer.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geojson, municipalities, metric, map]);

  return null;
}
