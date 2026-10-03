import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useState } from "react";
import type { MethaneGrid } from "../data";
import { shortName } from "../format";
import type { SatelliteResult, Site } from "../model/types";
import { bundledStyle, compass, ring, sector } from "./basemap";

type Props = { site: Site; sat: SatelliteResult; grid: MethaneGrid[string] | undefined };

// Free vector street tiles, no API key: https://openfreemap.org. Falls back to bundled land.
const STREETS = "https://tiles.openfreemap.org/styles/positron";
const CELL_DEG = 0.05; // the pipeline's grid bin
const LOW = "#fbe9df";
const HIGH = "#a4512a";

/** Site close-up: mean methane per grid cell, the 10 to 30 km analysis area and the prevailing wind. */
export default function SiteMap({ site, sat, grid }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const [fallback, setFallback] = useState(false);
  const { cells, lo, hi } = cellRange(grid);
  const wind = sat.wind;
  const towards = wind ? (wind.fromDeg + 180) % 360 : null;

  useEffect(() => {
    const m = new maplibregl.Map({
      container: container.current!,
      style: STREETS,
      center: [site.lon, site.lat],
      zoom: 8.6,
      attributionControl: { compact: true },
      cooperativeGestures: true,
    });
    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    let failed = false;
    m.on("error", () => {
      if (failed || m.isStyleLoaded()) return;
      failed = true;
      setFallback(true);
      m.setStyle(bundledStyle(false), { diff: false });
    });

    const { cells, lo, hi } = cellRange(grid);
    const addOverlays = () => {
      if (m.getSource("cells")) return;
      m.addSource("cells", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: cells.map(([lat, lon, ppb]) => {
            const h = CELL_DEG / 2;
            return {
              type: "Feature",
              properties: { ppb, norm: hi > lo ? (ppb - lo) / (hi - lo) : 0.5 },
              geometry: { type: "Polygon", coordinates: [[[lon - h, lat - h], [lon + h, lat - h], [lon + h, lat + h], [lon - h, lat + h], [lon - h, lat - h]]] },
            };
          }),
        },
      });
      m.addLayer({
        id: "cells",
        type: "fill",
        source: "cells",
        paint: { "fill-color": ["interpolate", ["linear"], ["get", "norm"], 0, LOW, 1, HIGH], "fill-opacity": 0.5, "fill-outline-color": "rgba(255,255,255,0.6)" },
      });

      const features: GeoJSON.Feature[] = [10, 30].map((km) => ({
        type: "Feature",
        properties: { kind: "ring" },
        geometry: { type: "LineString", coordinates: ring(site.lat, site.lon, km) },
      }));
      if (towards !== null) {
        features.push(
          { type: "Feature", properties: { kind: "down" }, geometry: { type: "Polygon", coordinates: [sector(site.lat, site.lon, towards, 30, 10, 30)] } },
          { type: "Feature", properties: { kind: "up" }, geometry: { type: "Polygon", coordinates: [sector(site.lat, site.lon, towards + 180, 30, 10, 30)] } },
        );
      }
      m.addSource("analysis", { type: "geojson", data: { type: "FeatureCollection", features } });
      m.addLayer({
        id: "sectors",
        type: "fill",
        source: "analysis",
        filter: ["!=", ["get", "kind"], "ring"],
        paint: { "fill-color": ["match", ["get", "kind"], "down", "#e58f65", "#5899e2"], "fill-opacity": 0.14 },
      });
      m.addLayer({
        id: "rings",
        type: "line",
        source: "analysis",
        filter: ["==", ["get", "kind"], "ring"],
        paint: { "line-color": "#404f4c", "line-width": 1.2, "line-dasharray": [2, 2] },
      });
    };
    m.on("style.load", addOverlays);

    const el = document.createElement("div");
    el.className = "pin selected";
    el.innerHTML = `<span class="pin-dot"></span><span class="pin-label">${shortName(site.name)}</span>`;
    new maplibregl.Marker({ element: el, anchor: "left" }).setLngLat([site.lon, site.lat]).addTo(m);

    return () => m.remove();
    // One map per site; the page remounts this component when the site changes.
  }, [site, grid, towards]);

  return (
    <div className="map-wrap">
      <div ref={container} className="map" />
      <div className="wind-card">
        {wind && towards !== null ? (
          <>
            <svg viewBox="0 0 40 40" className="wind-arrow" style={{ transform: `rotate(${towards}deg)` }} aria-hidden="true">
              <path d="M20 4 L28 20 L22 18 L22 36 L18 36 L18 18 L12 20 Z" />
            </svg>
            <span>
              Wind mostly from the <strong>{compass(wind.fromDeg)}</strong>, {wind.meanSpeedMs.toFixed(1)} m/s on average
              <span className="muted"> · ERA5, {sat.overpassesUsed} passes</span>
            </span>
          </>
        ) : (
          <span className="muted">
            Each satellite pass is split by that hour's wind. Prevailing wind for the arrow is not exported yet.
          </span>
        )}
      </div>
      <div className="map-legend">
        {cells.length > 0 ? (
          <>
            <span>Mean methane, Sentinel-5P cells (~5 km)</span>
            <span className="ramp" style={{ background: `linear-gradient(90deg, ${LOW}, ${HIGH})` }} />
            <span className="scale">
              <span>{lo.toFixed(0)} ppb</span>
              <span>{hi.toFixed(0)} ppb</span>
            </span>
          </>
        ) : (
          <span className="muted">No methane grid for this site yet.</span>
        )}
        <span className="legend-row">
          <span className="swatch ring" /> 10 and 30 km analysis area
        </span>
        {towards !== null && (
          <span className="legend-row">
            <span className="swatch down" /> downwind <span className="swatch up" /> upwind
          </span>
        )}
      </div>
      {fallback && <div className="map-error">Street tiles could not load, so a simple coastline map is shown.</div>}
    </div>
  );
}

function cellRange(grid: MethaneGrid[string] | undefined) {
  const cells = grid?.cells ?? [];
  const vals = cells.map((c) => c[2]);
  return { cells, lo: vals.length ? Math.min(...vals) : 0, hi: vals.length ? Math.max(...vals) : 0 };
}
