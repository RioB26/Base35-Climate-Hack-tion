import type { StyleSpecification } from "maplibre-gl";
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import landTopo from "world-atlas/land-50m.json";

// Natural Earth land (1:50m) bundled with the app, so the globe always draws even if a
// tile server is down. Detailed street tiles are only used on the site map.
const topo = landTopo as unknown as Topology<{ land: GeometryCollection }>;
export const land = flattenForTiles(feature(topo, topo.objects.land));

type Position = [number, number];

/** world-atlas is spherical, but MapLibre tiles polygons on a flat map. Three changes keep the
 * globe clean at the poles and the 180° line:
 * - shapes that cross 180° (Chukotka, Wrangel Island, Taveuni) are split there, instead of
 *   keeping edges that jump across the whole map;
 * - Antarctica's coast, which circles the pole, is closed along 90°S so it fills to the pole;
 * - the zero-area rings that sit on a pole are dropped. */
export function flattenForTiles<T extends GeoJSON.FeatureCollection>(fc: T): T {
  return {
    ...fc,
    features: fc.features.map((f) => {
      const g = f.geometry;
      if (g.type !== "Polygon" && g.type !== "MultiPolygon") return f;
      const polys = (g.type === "Polygon" ? [g.coordinates] : g.coordinates) as Position[][][];
      const fixed = polys.flatMap((rings) => splitAt180(rings.filter((r) => !onPole(r)).map(unwrapRing)));
      return { ...f, geometry: { type: "MultiPolygon", coordinates: fixed } };
    }),
  };
}

function onPole(r: Position[]): boolean {
  return r.every(([, lat]) => Math.abs(lat) > 89.9);
}

/** Unwraps longitudes so no edge is longer than 180°. A ring that circles a pole ends 360° from
 * where it started, so it is closed along that pole. */
export function unwrapRing(r: Position[]): Position[] {
  const out: Position[] = [r[0]];
  let shift = 0;
  for (let i = 1; i < r.length; i++) {
    const d = r[i][0] - r[i - 1][0];
    if (d > 180) shift -= 360;
    else if (d < -180) shift += 360;
    out.push([r[i][0] + shift, r[i][1]]);
  }
  if (shift === 0) return out;
  const first = out[0];
  const last = out[out.length - 1];
  const pole = first[1] + last[1] < 0 ? -90 : 90;
  return [...out, [last[0], pole], [first[0], pole], first];
}

/** Cuts an unwrapped polygon into one piece per 360° band and shifts each piece back into
 * -180..180. */
function splitAt180(rings: Position[][]): Position[][][] {
  if (rings.length === 0) return [];
  const xs = rings[0].map(([x]) => x);
  const lo = Math.floor((Math.min(...xs) + 180) / 360);
  const hi = Math.ceil((Math.max(...xs) + 180) / 360) - 1;
  if (lo === 0 && hi === 0) return [rings];
  const pieces: Position[][][] = [];
  for (let k = lo; k <= hi; k++) {
    const shift = k * 360;
    const cut = rings
      .map((r) => clipX(r, shift - 180, shift + 180).map(([x, y]): Position => [x - shift, y]))
      .filter((r) => r.length >= 4);
    // Holes sit inside the outer ring, so a band without the outer ring has nothing to draw.
    if (cut.length > 0 && clipX(rings[0], shift - 180, shift + 180).length >= 4) pieces.push(cut);
  }
  return pieces;
}

/** Sutherland-Hodgman clip of a closed ring to min <= x <= max. */
function clipX(ring: Position[], min: number, max: number): Position[] {
  let pts = ring.slice(0, -1);
  for (const [edge, keep] of [
    [min, (x: number) => x >= min],
    [max, (x: number) => x <= max],
  ] as const) {
    const out: Position[] = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      if (keep(a[0])) out.push(a);
      if (keep(a[0]) !== keep(b[0])) out.push([edge, a[1] + ((edge - a[0]) / (b[0] - a[0])) * (b[1] - a[1])]);
    }
    pts = out;
    if (pts.length === 0) return [];
  }
  return [...pts, pts[0]];
}

export const COLORS = {
  ocean: "#dbe6ee",
  land: "#eeebe1",
};

const GLOBE_COLORS = { ocean: "#7da5b8", land: "#eeebe1" };

/** Self-contained style: ocean and land, with no network requests. No coastline layer:
 * polygons cut at the antimeridian would draw a stray line across the globe. */
export function bundledStyle(globe: boolean): StyleSpecification {
  const colors = globe ? GLOBE_COLORS : COLORS;
  return {
    version: 8,
    ...(globe ? { projection: { type: "globe" } } : {}),
    sources: { land: { type: "geojson", data: land } },
    layers: [
      { id: "ocean", type: "background", paint: { "background-color": colors.ocean } },
      { id: "land", type: "fill", source: "land", paint: { "fill-color": colors.land } },
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
