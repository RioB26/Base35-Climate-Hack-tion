import type { StyleSpecification } from "maplibre-gl";
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import landTopo from "world-atlas/land-50m.json";

// Natural Earth land (1:50m) bundled with the app, so the globe always draws even if a
// tile server is down. Detailed street tiles are only used on the site map.
const topo = landTopo as unknown as Topology<{ land: GeometryCollection }>;
export const land = feature(topo, topo.objects.land);

export const COLORS = {
  ocean: "#dbe6ee",
  land: "#eeebe1",
};

/** Self-contained style: ocean and land, with no network requests. No coastline layer:
 * polygons cut at the antimeridian would draw a stray line across the globe. */
export function bundledStyle(globe: boolean): StyleSpecification {
  return {
    version: 8,
    ...(globe ? { projection: { type: "globe" } } : {}),
    sources: { land: { type: "geojson", data: land } },
    layers: [
      { id: "ocean", type: "background", paint: { "background-color": COLORS.ocean } },
      { id: "land", type: "fill", source: "land", paint: { "fill-color": COLORS.land } },
    ],
  };
}

/** Circle of radius km around a point, as a closed ring of [lon, lat]. */
export function ring(lat: number, lon: number, km: number): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i <= 64; i++) pts.push(offset(lat, lon, km, (i / 64) * 360));
  return pts;
}

/** Point `km` from (lat, lon) along `bearingDeg` (flat-earth approximation, fine at 30 km). */
export function offset(lat: number, lon: number, km: number, bearingDeg: number): [number, number] {
  const b = (bearingDeg * Math.PI) / 180;
  const dLat = (km / 111.32) * Math.cos(b);
  const dLon = (km / (111.32 * Math.cos((lat * Math.PI) / 180))) * Math.sin(b);
  return [lon + dLon, lat + dLat];
}

/** Annular sector between two radii, centred on `bearingDeg`, ±halfDeg wide. */
export function sector(lat: number, lon: number, bearingDeg: number, halfDeg: number, innerKm: number, outerKm: number): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i <= 16; i++) pts.push(offset(lat, lon, outerKm, bearingDeg - halfDeg + (i / 16) * 2 * halfDeg));
  for (let i = 16; i >= 0; i--) pts.push(offset(lat, lon, innerKm, bearingDeg - halfDeg + (i / 16) * 2 * halfDeg));
  pts.push(pts[0]);
  return pts;
}

const COMPASS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
export const compass = (deg: number) => COMPASS[Math.round((((deg % 360) + 360) % 360) / 45) % 8];
