import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useState } from "react";
import type { MethaneGrid, TanagerSite } from "../data";
import { shortName } from "../format";
import type { SatelliteResult, Site } from "../model/types";
import { CurrencyAnchor } from "./currency";
import { bundledStyle, ring, sector } from "./basemap";
import { Info } from "./Info";
import { VisualFallback } from "./Mark";

type Props = { site: Site; sat: SatelliteResult; grid: MethaneGrid[string] | undefined; tanager: TanagerSite };

// Free vector street tiles, no API key: https://openfreemap.org. Falls back to bundled land.
const STREETS = "https://tiles.openfreemap.org/styles/positron";
const CELL_DEG = 0.05; // the pipeline's grid bin
const LOW = "#fbe9df";
const HIGH = "#a4512a";

/** Site close-up: mean methane per grid cell, the 10 to 30 km analysis area and the prevailing wind. */
export default function SiteMap({ site, sat, grid, tanager }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const analysisBaseRef = useRef<GeoJSON.Feature[]>([]);
  const windMarkersRef = useRef<maplibregl.Marker[]>([]);
  const showWindRef = useRef(true);
  const [fallback, setFallback] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [mapLayer, setMapLayer] = useState<"low" | "high">("low");
  const [showWind, setShowWind] = useState(true);
  const hasHighResolution = tanager.observations.length > 0;
  const { cells, lo, hi } = cellRange(grid);
  const wind = sat.wind;
  const towards = wind ? (wind.fromDeg + 180) % 360 : null;
  const windAvailable = towards !== null;
  showWindRef.current = showWind;

  useEffect(() => {
    if (!container.current) return;
    let m: maplibregl.Map;
    try {
      m = new maplibregl.Map({
        container: container.current,
        style: STREETS,
        center: [site.lon, site.lat],
        zoom: tanager.observations.length > 0 || tanager.status === "no_public_coverage" ? 11.5 : 8.6,
        attributionControl: { compact: true },
        cooperativeGestures: true,
      });
    } catch {
      setUnavailable(true);
      return;
    }
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
      if (mapLayer === "low") {
        m.addSource("cells", {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: cells.map(([lat, lon, ppb]) => {
              const half = CELL_DEG / 2;
              return {
                type: "Feature",
                properties: { ppb, norm: hi > lo ? (ppb - lo) / (hi - lo) : 0.5 },
                geometry: {
                  type: "Polygon",
                  coordinates: [[
                    [lon - half, lat - half],
                    [lon + half, lat - half],
                    [lon + half, lat + half],
                    [lon - half, lat + half],
                    [lon - half, lat - half],
                  ]],
                },
              };
            }),
          },
        });
        m.addLayer({
          id: "cells",
          type: "fill",
          source: "cells",
          paint: {
            "fill-color": ["interpolate", ["linear"], ["get", "norm"], 0, LOW, 1, HIGH],
            "fill-opacity": 0.2,
            "fill-outline-color": "rgba(116,72,47,0.28)",
          },
        });
      }
      if (hasHighResolution && mapLayer === "high") {
        m.addSource("tanager", {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: tanager.observations.map((observation) => ({
              type: "Feature",
              properties: {
                plumeId: observation.plumeId,
                rate: observation.emissionKgPerHour ?? -1,
              },
              geometry: { type: "Point", coordinates: [observation.lon, observation.lat] },
            })),
          },
        });
        m.addLayer({
          id: "tanager-plumes",
          type: "circle",
          source: "tanager",
          paint: {
            "circle-color": "#c55235",
            "circle-radius": 5,
            "circle-stroke-color": "#fffaf3",
            "circle-stroke-width": 2,
            "circle-opacity": 1,
          },
        });
      }

      const features: GeoJSON.Feature[] = [10, 30].map((km) => ({
        type: "Feature",
        properties: { kind: "ring" },
        geometry: { type: "LineString", coordinates: ring(site.lat, site.lon, km) },
      }));
      analysisBaseRef.current = features.slice();
      if (hasHighResolution && mapLayer === "high") {
        for (const observation of tanager.observations) {
          features.push({
            type: "Feature",
            properties: { kind: "tanager-link" },
            geometry: {
              type: "LineString",
              coordinates: [
                [site.lon, site.lat],
                [observation.lon, observation.lat],
              ],
            },
          });
        }
      }
      if (showWindRef.current && towards !== null) {
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
      if (hasHighResolution && mapLayer === "high") {
        m.addLayer({
          id: "tanager-links",
          type: "line",
          source: "analysis",
          filter: ["==", ["get", "kind"], "tanager-link"],
          paint: { "line-color": "#c55235", "line-width": 1.5, "line-dasharray": [1.5, 2], "line-opacity": 0.75 },
        });
      }
    };
    m.on("style.load", addOverlays);
    mapRef.current = m;

    const el = document.createElement("div");
    el.className = "pin selected";
    el.innerHTML = '<span class="pin-dot"></span><span class="pin-label"></span>';
    el.querySelector<HTMLSpanElement>(".pin-label")!.textContent = shortName(site.name);
    new maplibregl.Marker({ element: el, anchor: "left" }).setLngLat([site.lon, site.lat]).addTo(m);
    if (showWindRef.current && towards !== null) {
      [
        { label: "Downwind", bearing: towards, className: "downwind" },
        { label: "Upwind", bearing: (towards + 180) % 360, className: "upwind" },
      ].forEach(({ label, bearing, className }) => {
        const direction = document.createElement("div");
        direction.className = `wind-direction ${className}`;
        direction.style.setProperty("--wind-bearing", `${bearing}deg`);
        const arrow = document.createElement("span");
        arrow.className = "wind-direction-arrow";
        arrow.setAttribute("aria-hidden", "true");
        const text = document.createElement("span");
        text.className = "wind-direction-label";
        text.textContent = label;
        direction.append(arrow, text);
        direction.setAttribute("aria-label", `${label.toLowerCase()} wind direction`);
        const marker = new maplibregl.Marker({ element: direction, anchor: "center", offset: windMarkerOffset(bearing) })
          .setLngLat([site.lon, site.lat])
          .addTo(m);
        windMarkersRef.current.push(marker);
      });
    }
    if (hasHighResolution && mapLayer === "high") tanager.observations.forEach((observation, index) => {
      const plume = document.createElement("div");
      plume.className = "tanager-pin";
      plume.innerHTML = `<span class="tanager-pin-dot"></span><span class="tanager-pin-label">Tanager plume ${index + 1}</span>`;
      plume.setAttribute("aria-label", `Tanager plume ${index + 1}`);
      new maplibregl.Marker({ element: plume, anchor: "left" })
        .setLngLat([observation.lon, observation.lat])
        .addTo(m);
    });

    return () => {
      windMarkersRef.current = [];
      analysisBaseRef.current = [];
      mapRef.current = null;
      m.remove();
    };
    // One map per site; the page remounts this component when the site changes.
  }, [site, grid, towards, tanager, mapLayer, hasHighResolution]);

  useEffect(() => {
    const m = mapRef.current;
    if (!m) return;
    const source = m.getSource("analysis");
    if (source?.type === "geojson" && "setData" in source && typeof source.setData === "function") {
      const features = analysisBaseRef.current.slice();
      if (showWind && towards !== null) {
        features.push(
          { type: "Feature", properties: { kind: "down" }, geometry: { type: "Polygon", coordinates: [sector(site.lat, site.lon, towards, 30, 10, 30)] } },
          { type: "Feature", properties: { kind: "up" }, geometry: { type: "Polygon", coordinates: [sector(site.lat, site.lon, towards + 180, 30, 10, 30)] } },
        );
      }
      source.setData({ type: "FeatureCollection", features });
    }
    windMarkersRef.current.forEach((marker) => {
      marker.getElement().style.display = showWind ? "" : "none";
    });
  }, [showWind, site.lat, site.lon, towards]);

  if (unavailable) {
    return (
      <div className="map-wrap">
        <VisualFallback className="map" title="Interactive map unavailable" detail="The satellite comparison and site evidence are still available. Continue below to explore a capture project." />
      </div>
    );
  }

  return (
    <section className="map-panel" aria-label="Satellite evidence map">
      <div className="map-toolbar">
        <h2>Explore the satellite evidence</h2>
        <div className="map-controls">
        {hasHighResolution ? (
          <div className="map-layer-toggle" role="group" aria-label="Map evidence layer">
            <button type="button" aria-pressed={mapLayer === "low"} onClick={() => setMapLayer("low")}>
              <strong>Regional screening</strong><span>Sentinel-5P · coarse cells</span>
            </button>
            <button type="button" aria-pressed={mapLayer === "high"} onClick={() => setMapLayer("high")}>
              <strong>Source observations</strong><span>Tanager · high resolution</span>
            </button>
          </div>
        ) : <p>Sentinel-5P regional context. Facility-scale observations are unavailable.</p>}
        <div className="map-toolbar-row">
          {windAvailable ? (
            <button
              type="button"
              className={`wind-toggle ${showWind ? "active" : ""}`}
              aria-pressed={showWind}
              onClick={() => setShowWind((visible) => !visible)}
            >
              <span className="wind-toggle-mark" aria-hidden="true">↝</span>
              Wind overlay {showWind ? "on" : "off"}
            </button>
          ) : (
            <div className="wind-toggle unavailable" role="status">
              <span className="wind-toggle-mark" aria-hidden="true">↝</span>
              Wind overlay unavailable
            </div>
          )}
          <Info label="About the wind overlay">
            Each satellite pass is split by that hour's wind. Prevailing wind for the arrow is not exported yet.
          </Info>
        </div>
        </div>
      </div>
      <div className="map-wrap">
        <div ref={container} className="map" />
        <CurrencyAnchor />
        <div className="map-legend" tabIndex={0} aria-label="Map legend">
          <span className="map-legend-head">
            <span className="swatch ring" />
            {tanager.observations.length > 0 && <span className="swatch tanager" />}
            Legend
          </span>
          <div className="map-legend-body">
          {cells.length > 0 ? (
            <>
              {(mapLayer === "low" || !hasHighResolution) && (
                <>
                  <span>Regional context · Sentinel-5P cells (~5 km)</span>
                  <span className="ramp" style={{ background: `linear-gradient(90deg, ${LOW}, ${HIGH})` }} />
                  <span className="scale">
                    <span>{lo.toFixed(0)} ppb</span>
                    <span>{hi.toFixed(0)} ppb</span>
                  </span>
                </>
              )}
            </>
          ) : (
            <span className="muted">No methane grid for this site yet.</span>
          )}
          {tanager.observations.length > 0 && (
            <span>Facility-scale source points · Tanager observations</span>
          )}
          {tanager.observations.length === 0 && (
            <span className="coverage-gap">
              <span className="coverage-gap-dot" /> Coarse regional screening only
            </span>
          )}
          <span className="legend-row">
            <span className="swatch ring" /> 10 and 30 km analysis area
          </span>
          {tanager.observations.length > 0 && (
            <span className="legend-row">
              <span className="swatch tanager" /> Tanager plume record
            </span>
          )}
          {showWind && towards !== null && (
            <span className="legend-row">
              <span className="swatch down" /> downwind <span className="swatch up" /> upwind
            </span>
          )}
          </div>
        </div>
        {fallback && <div className="map-error">Street tiles could not load, so a simple coastline map is shown.</div>}
      </div>
    </section>
  );
}

function cellRange(grid: MethaneGrid[string] | undefined) {
  const cells = grid?.cells ?? [];
  const vals = cells.map((c) => c[2]);
  return { cells, lo: vals.length ? Math.min(...vals) : 0, hi: vals.length ? Math.max(...vals) : 0 };
}

function windMarkerOffset(bearingDeg: number): [number, number] {
  const radians = (bearingDeg * Math.PI) / 180;
  const distancePx = 46;
  return [Math.round(Math.sin(radians) * distancePx), Math.round(-Math.cos(radians) * distancePx)];
}
