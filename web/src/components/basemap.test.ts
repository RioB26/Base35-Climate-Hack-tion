import { describe, expect, it } from "vitest";
import { flattenForTiles, land, unwrapRing } from "./basemap";

type Ring = [number, number][];
const rings = (fc: GeoJSON.FeatureCollection) =>
  fc.features.flatMap((f) => (f.geometry.type === "MultiPolygon" ? f.geometry.coordinates.flat() : [])) as Ring[];

describe("bundled land for the globe", () => {
  it("has no edge that jumps across the 180° line", () => {
    for (const r of rings(land)) {
      for (let i = 1; i < r.length; i++) {
        const [[x0, y0], [x1, y1]] = [r[i - 1], r[i]];
        // Antarctica's closing edge along 90°S is the only long one allowed.
        if (y0 === -90 && y1 === -90) continue;
        expect(Math.abs(x1 - x0)).toBeLessThanOrEqual(180);
      }
    }
  });

  it("keeps every longitude inside -180 to 180", () => {
    for (const r of rings(land)) for (const [x] of r) expect(Math.abs(x)).toBeLessThanOrEqual(180);
  });

  it("drops the zero-area rings that sit on a pole", () => {
    expect(rings(land).some((r) => r.every(([, y]) => Math.abs(y) > 89.9))).toBe(false);
  });

  it("fills Antarctica down to the South Pole", () => {
    expect(rings(land).some((r) => r.some(([, y]) => y === -90))).toBe(true);
  });
});

describe("unwrapRing", () => {
  it("closes a ring that circles the South Pole along 90°S", () => {
    const r: Ring = [[0, -70], [120, -70], [-120, -70], [0, -70]];
    expect(unwrapRing(r)).toEqual([[0, -70], [120, -70], [240, -70], [360, -70], [360, -90], [0, -90], [0, -70]]);
  });

  it("leaves a ring that does not cross 180° alone", () => {
    const r: Ring = [[10, 0], [20, 0], [20, 10], [10, 0]];
    expect(unwrapRing(r)).toEqual(r);
  });
});

describe("flattenForTiles", () => {
  it("splits an island that crosses 180° into two pieces", () => {
    const island: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: [{
        type: "Feature",
        properties: {},
        geometry: { type: "Polygon", coordinates: [[[179, -16], [-179, -16], [-179, -17], [179, -17], [179, -16]]] },
      }],
    };
    const geom = flattenForTiles(island).features[0].geometry as GeoJSON.MultiPolygon;
    expect(geom.coordinates).toHaveLength(2);
    const xs = geom.coordinates.flat(2).map(([x]) => x);
    expect(Math.min(...xs)).toBe(-180);
    expect(Math.max(...xs)).toBe(180);
  });
});
