import { describe, expect, it } from "vitest";
import { defaultAssumptions } from "../data/assumptions";
import { cop31Score, methaneCut } from "./cop31";
import { compareWithSatellite, emissionFromPpb, ppbFromEmission } from "./discrepancy";
import { computeSite } from "./project";
import { sizeClass, stillOperating, wasteInPlace } from "./size";
import type { SatelliteResult, Site } from "./types";

const a = { ...defaultAssumptions };

const site = (over: Partial<Site> = {}): Site => ({
  id: "t",
  name: "Test",
  state: "NSW",
  lat: 0,
  lon: 0,
  acceptance: [{ fromYear: 2000, toYear: 2030, tonnesPerYear: 1_000_000 }],
  k: 0.05,
  L0: 100,
  existingCapture: 0.5,
  illustrative: true,
  notes: "",
  sources: [],
  ...over,
});

const sat = (over: Partial<SatelliteResult> = {}): SatelliteResult => ({
  status: "elevated",
  overpassesUsed: 30,
  windowStart: "2024-10-01T00:00",
  windowEnd: "2025-09-30T00:00",
  deltaPpb: 5,
  ci95Ppb: [2, 8],
  confidence: "high",
  note: "",
  ...over,
});

describe("mass balance", () => {
  it("matches a hand calculation: 26,000 t/yr at 5 m/s is about 1.25 ppb", () => {
    // 26,000 t/yr = 0.824 kg/s; / (5 m/s x 23.1 km) = 7.1e-6 kg/m2 = 4.45e-4 mol/m2; / 3.567e5 mol air.
    expect(ppbFromEmission(26_000, 5)).toBeCloseTo(1.25, 2);
  });
  it("inverts cleanly", () => {
    expect(emissionFromPpb(ppbFromEmission(12_345, 3), 3)).toBeCloseTo(12_345, 6);
  });
  it("falls as wind speed rises", () => {
    expect(ppbFromEmission(1000, 10)).toBeCloseTo(ppbFromEmission(1000, 5) / 2, 9);
  });
});

describe("satellite comparison", () => {
  it("flags higher when the expected signal sits below the observed range", () => {
    const c = compareWithSatellite(site(), sat({ deltaPpb: 50, ci95Ppb: [40, 60] }), a);
    expect(c.verdict).toBe("higher");
    expect(c.gapPpb).toBeCloseTo(50 - c.expectedPpb, 9);
    expect(c.windAssumed).toBe(true);
  });
  it("is consistent when the expected signal sits inside the observed range", () => {
    const c0 = compareWithSatellite(site(), sat(), a);
    const c = compareWithSatellite(site(), sat({ ci95Ppb: [c0.expectedPpb - 1, c0.expectedPpb + 1] }), a);
    expect(c.verdict).toBe("consistent");
  });
  it("flags lower when the satellite sees less than the reported figures imply", () => {
    const c = compareWithSatellite(site({ existingCapture: 0 }), sat({ deltaPpb: 0, ci95Ppb: [-0.1, 0.1] }), a);
    expect(c.verdict).toBe("lower");
  });
  it("says when the signal is more than the landfill could produce at all", () => {
    const c = compareWithSatellite(site(), sat({ deltaPpb: 500, ci95Ppb: [400, 600] }), a);
    expect(c.exceedsGeneration).toBe(true);
  });
  it("uses published emissions when a site has them", () => {
    const c = compareWithSatellite(site({ reportedEmissions: { tCH4PerYear: 1234, year: 2024, source: "x" } }), sat(), a);
    expect(c.reportedEmissionT).toBe(1234);
    expect(c.reportedBasis).toBe("reported");
  });
  it("uses exported wind when present", () => {
    const c = compareWithSatellite(site(), sat({ wind: { meanSpeedMs: 2.5, fromDeg: 200, rose: [] } }), a);
    expect(c.windAssumed).toBe(false);
    expect(c.expectedPpb).toBeCloseTo(ppbFromEmission(c.reportedEmissionT, 2.5), 9);
  });
  it("has no verdict with too few overpasses", () => {
    expect(compareWithSatellite(site(), sat({ overpassesUsed: 5 }), a).verdict).toBe("no_data");
  });
});

describe("COP31 alignment check", () => {
  it("scores four parts out of 25", () => {
    const s = site();
    const score = cop31Score(s, computeSite(s, a), a)!;
    expect(score.parts).toHaveLength(4);
    expect(score.total).toBeCloseTo(score.parts.reduce((t, p) => t + p.points, 0), 9);
    for (const p of score.parts) expect(p.points).toBeGreaterThanOrEqual(0), expect(p.points).toBeLessThanOrEqual(25);
  });
  it("gives 15 points for exactly the Pledge's 30% cut", () => {
    // 50% existing, 65% target: (0.65 - 0.5) / 0.5 = 30% of escaping methane.
    const s = site();
    const b = { ...a, captureEfficiency: 0.65 };
    expect(methaneCut(s, b)).toBeCloseTo(0.3, 9);
    expect(cop31Score(s, computeSite(s, b), b)!.parts[0].points).toBeCloseTo(15, 6);
  });
  it("gives full speed points by 2030 and none at 2035", () => {
    const s = site();
    const at = (y: number) => cop31Score(s, computeSite(s, { ...a, commissioningYear: y }), { ...a, commissioningYear: y })!.parts[1].points;
    expect(at(2030)).toBe(25);
    expect(at(2032)).toBeCloseTo(15, 9);
  });
  it("is not scored when there is no project", () => {
    const s = site({ existingCapture: 0.9 });
    expect(cop31Score(s, computeSite(s, a), a)).toBeNull();
  });
});

describe("size class", () => {
  it("counts waste in place up to a year", () => {
    expect(wasteInPlace(site(), 2009)).toBe(10_000_000);
  });
  it("splits at 10 Mt and 30 Mt", () => {
    expect(sizeClass(site(), 2005)).toBe("small");
    expect(sizeClass(site(), 2015)).toBe("medium");
    expect(sizeClass(site(), 2030)).toBe("large");
  });
  it("knows whether the site still takes waste", () => {
    expect(stillOperating(site(), 2025)).toBe(true);
    expect(stillOperating(site(), 2031)).toBe(false);
  });
});
