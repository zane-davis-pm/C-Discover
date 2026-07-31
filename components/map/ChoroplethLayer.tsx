"use client";

// ============================================================
// C-Discover — County Choropleth Layer
// T-52: SPEC.md §8.2, §8.3, §8.4
//
// Renders counties.geo.json as a GeoJSON layer in react-leaflet.
// Each county polygon is filled by the choropleth color scale.
// Clicking a county opens a popup.
// ============================================================

import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import * as L from "leaflet";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";

import { CountyPopupContent } from "@/components/map/MapPopup";
import { buildChoroplethScale } from "@/lib/choropleth";
import { useShortlist } from "@/lib/shortlist";
import type { County, CountyMetric } from "@/lib/types";

interface ChoroplethLayerProps {
  geojson: GeoJSON.FeatureCollection;
  counties: County[];
  metric: CountyMetric;
  /** When true (Municipalities mode), render county polygons as outlines only — no fill. */
  outlineOnly?: boolean;
  /** Opens the deep-dive overlay for a county (handled by MapView). */
  onDeepDive?: (county: County) => void;
}

/**
 * Build a lookup from normalized county name → County object.
 * Keys: lowercase stripped form, e.g." miami-dade "
 */
function buildCountyLookup(counties: County[]): Map<string, County> {
  const map = new Map<string, County>();
  for (const c of counties) {
    // Primary key: full name lowercased
    map.set(c.name.toLowerCase(), c);
    // Short form without " County "
    const short = c.name
      .replace(/ County$/i, "")
      .trim()
      .toLowerCase();
    map.set(short, c);
    // FIPS key
    map.set(c.fips, c);
  }
  return map;
}

/** Attempt to find a county by GeoJSON feature properties. */
function matchCounty(
  props: Record<string, unknown>,
  lookup: Map<string, County>,
): County | undefined {
  // Common property names in FL county GeoJSON
  const candidates = [
    props["COUNTYNAME"],
    props["NAME"],
    props["name"],
    props["COUNTY"],
    props["county"],
    props["COUNTYFP"],
    props["GEOID"],
  ]
    .filter(Boolean)
    .map(String);

  for (const raw of candidates) {
    const key = raw
      .toLowerCase()
      .replace(/ county$/i, "")
      .trim();
    if (lookup.has(key)) return lookup.get(key);
    // Full match
    if (lookup.has(raw.toLowerCase())) return lookup.get(raw.toLowerCase());
    // Try with " County " appended
    if (lookup.has(`${key} county`)) return lookup.get(`${key} county`);
  }
  return undefined;
}

export function ChoroplethLayer({
  geojson,
  counties,
  metric,
  outlineOnly = false,
  onDeepDive,
}: ChoroplethLayerProps) {
  const map = useMap();
  const layerRef = useRef<L.GeoJSON | null>(null);
  const { add, remove, has } = useShortlist();

  // Popup content is rendered outside the React tree (createRoot), so the
  // click handler would otherwise capture a stale callback. Keeping it in a
  // ref lets the handler stay current without rebuilding the whole layer.
  const onDeepDiveRef = useRef(onDeepDive);
  onDeepDiveRef.current = onDeepDive;

  useEffect(() => {
    if (!geojson || !counties.length) return;

    // Remove previous layer
    if (layerRef.current) {
      layerRef.current.remove();
      layerRef.current = null;
    }

    const lookup = buildCountyLookup(counties);
    const scale = buildChoroplethScale(counties, metric);

    const layer = L.geoJSON(geojson, {
      style: (feature) => {
        // Municipalities mode: outline only — no fill (V2-MAP-03)
        if (outlineOnly) {
          return {
            fillOpacity: 0,
            color: "#d1d5db", // gray-300
            weight: 0.5,
            opacity: 0.8,
          };
        }

        const props = (feature?.properties ?? {}) as Record<string, unknown>;
        const county = matchCounty(props, lookup);
        const value = county ? (county[metric] as number | null) : null;
        const fillColor = scale.colorFor(value);

        return {
          fillColor,
          fillOpacity: 0.75,
          color: "#ffffff",
          weight: 1,
          opacity: 0.8,
        };
      },
      onEachFeature: (feature, featureLayer) => {
        // In outline-only mode, county polygons are background context only — no interaction
        if (outlineOnly) return;

        const props = (feature?.properties ?? {}) as Record<string, unknown>;
        const county = matchCounty(props, lookup);
        if (!county) return;

        featureLayer.on("click", () => {
          const container = document.createElement("div");
          const root = createRoot(container);

          const renderPopup = (inShortlist: boolean) => {
            root.render(
              <CountyPopupContent
                county={county}
                metric={metric}
                inShortlist={inShortlist}
                onDeepDive={(c) => {
                  map.closePopup();
                  onDeepDiveRef.current?.(c);
                }}
                onToggleShortlist={(c) => {
                  if (has(c.id, c.state)) {
                    remove(c.id, c.state);
                    renderPopup(false);
                  } else {
                    add(c);
                    renderPopup(true);
                  }
                }}
              />,
            );
          };

          // flushSync ensures React renders content into `container` before
          // Leaflet measures the popup width for autoPan calculations.
          flushSync(() => renderPopup(has(county.id, county.state)));

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

    layer.addTo(map);
    layerRef.current = layer;

    return () => {
      layer.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geojson, counties, metric, outlineOnly, map]);

  return null;
}
