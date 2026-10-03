import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useState } from "react";
import { shortName } from "../format";
import type { Site } from "../model/types";

export type MethaneGrid = Record<string, { windowStart: string; windowEnd: string; cells: [lat: number, lon: number, ppb: number][] }>;

type Props = {
  sites: Site[];
  /** Site id -> "funded" | "unfunded" | "none" (no capture headroom). */
  status: Record<string, "funded" | "unfunded" | "none">;
  selectedId: string;
  onSelect: (id: string) => void;
  grid: MethaneGrid;
};

// Free vector basemap, no API key: https://openfreemap.org
const STYLE = "https://tiles.openfreemap.org/styles/positron";

/** Circle of radius km around a point, as a GeoJSON ring. */
function ring(lat: number, lon: number, km: number): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i <= 64; i++) {
    const t = (i / 64) * 2 * Math.PI;
    const dLat = (km / 111.32) * Math.sin(t);
    const dLon = (km / (111.32 * Math.cos((lat * Math.PI) / 180))) * Math.cos(t);
    pts.push([lon + dLon, lat + dLat]);
  }
  return pts;
}

export default function MapView({ sites, status, selectedId, onSelect, grid }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markers = useRef<Record<string, { marker: maplibregl.Marker; el: HTMLDivElement }>>({});
  const [loaded, setLoaded] = useState(false);
  const [basemapFailed, setBasemapFailed] = useState(false);
  const [showMethane, setShowMethane] = useState(true);
  const hasGrid = Object.values(grid).some((g) => g.cells.length > 0);

  // Create the map once.
  useEffect(() => {
    const m = new maplibregl.Map({
      container: container.current!,
      style: STYLE,
      bounds: [
        [112, -47.5],
        [179, -10],
      ],
      fitBoundsOptions: { padding: 24 },
      attributionControl: { compact: true },
      cooperativeGestures: true,
    });
    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    m.on("error", (e) => {
      if (!m.isStyleLoaded() && String(e.error?.message ?? "").length > 0) setBasemapFailed(true);
    });
    m.on("load", () => {
      m.addSource("analysis", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      m.addLayer({ id: "analysis-line", type: "line", source: "analysis", paint: { "line-color": "#5899e2", "line-width": 1.5, "line-dasharray": [2, 2] } });
      m.addSource("methane", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      m.addLayer({
        id: "methane",
        type: "circle",
        source: "methane",
        paint: {
          "circle-radius": ["interpolate", ["exponential", 2], ["zoom"], 4, 2, 8, 14, 10, 40],
          "circle-color": ["interpolate", ["linear"], ["get", "norm"], 0, "#5899e2", 0.5, "#f5e6c8", 1, "#e58f65"],
          "circle-opacity": 0.55,
          "circle-blur": 0.6,
        },
      });
      setLoaded(true);
    });
    map.current = m;
    return () => {
      m.remove();
      map.current = null;
      markers.current = {};
    };
  }, []);

  // Site markers (DOM, so they need no map fonts).
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    for (const s of sites) {
      let entry = markers.current[s.id];
      if (!entry) {
        const el = document.createElement("div");
        el.className = "pin";
        el.innerHTML = `<span class="pin-dot"></span><span class="pin-label">${shortName(s.name)}</span>`;
        el.addEventListener("click", () => onSelect(s.id));
        entry = { el, marker: new maplibregl.Marker({ element: el, anchor: "left" }).setLngLat([s.lon, s.lat]).addTo(m) };
        markers.current[s.id] = entry;
      }
      entry.el.dataset.status = status[s.id];
      entry.el.classList.toggle("selected", s.id === selectedId);
    }
  }, [sites, status, selectedId, onSelect]);

  // Analysis rings and fly-to for the selected site.
  useEffect(() => {
    const m = map.current;
    const s = sites.find((x) => x.id === selectedId);
    if (!m || !s) return;
    if (loaded) {
      (m.getSource("analysis") as maplibregl.GeoJSONSource).setData({
        type: "FeatureCollection",
        features: [10, 30].map((km) => ({
          type: "Feature",
          properties: { km },
          geometry: { type: "LineString", coordinates: ring(s.lat, s.lon, km) },
        })),
      });
    }
    m.flyTo({ center: [s.lon, s.lat], zoom: 8, duration: 1200 });
  }, [selectedId, sites, loaded]);

  // Methane layer from the pipeline's grid export, normalised per site.
  useEffect(() => {
    const m = map.current;
    if (!m || !loaded) return;
    const features = Object.values(grid).flatMap((g) => {
      const vals = g.cells.map((c) => c[2]);
      const lo = Math.min(...vals);
      const hi = Math.max(...vals);
      return g.cells.map(([lat, lon, ppb]) => ({
        type: "Feature" as const,
        properties: { ppb, norm: hi > lo ? (ppb - lo) / (hi - lo) : 0.5 },
        geometry: { type: "Point" as const, coordinates: [lon, lat] },
      }));
    });
    (m.getSource("methane") as maplibregl.GeoJSONSource).setData({ type: "FeatureCollection", features });
    m.setLayoutProperty("methane", "visibility", showMethane ? "visible" : "none");
  }, [grid, loaded, showMethane]);

  return (
    <div className="map-wrap">
      <div ref={container} className="map" />
      <div className="map-legend">
        <div className="legend-row">
          <span className="swatch funded" /> Funded at current budget
        </div>
        <div className="legend-row">
          <span className="swatch unfunded" /> Not funded
        </div>
        <div className="legend-row">
          <span className="swatch none" /> No capture headroom
        </div>
        <div className="legend-row">
          <span className="swatch ring" /> 10 and 30 km analysis rings
        </div>
        {hasGrid ? (
          <label className="legend-row toggle">
            <input type="checkbox" checked={showMethane} onChange={(e) => setShowMethane(e.target.checked)} /> Mean
            Sentinel-5P methane (low to high, per site)
          </label>
        ) : (
          <div className="legend-row muted">Methane layer not generated yet: run the satellite pipeline.</div>
        )}
      </div>
      {basemapFailed && <div className="map-error">Basemap tiles could not load. Site positions are still shown.</div>}
    </div>
  );
}
