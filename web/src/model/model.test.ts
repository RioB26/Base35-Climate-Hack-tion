import { describe, expect, it } from "vitest";
import { defaultAssumptions } from "../data/assumptions";
import { methaneGeneratedM3 } from "./generation";
import { buildPortfolio } from "./macc";
import { annualPhysics, computeSite } from "./project";
import type { Assumptions, Site, SiteResult } from "./types";

const a: Assumptions = { ...defaultAssumptions };

const site = (over: Partial<Site> = {}): Site => ({
  id: "t",
  name: "Test",
  state: "NSW",
  lat: 0,
  lon: 0,
  acceptance: [{ fromYear: 2000, toYear: 2030, tonnesPerYear: 100000 }],
  k: 0.05,
  L0: 100,
  existingCapture: 0,
  illustrative: true,
  notes: "",
  sources: [],
  ...over,
});

describe("worked example: 1,000 m3/h landfill gas at 50% CH4", () => {
  // 500 m3/h of methane, all year.
  const p = annualPhysics(500 * 8760, 0, a);

  it("generates about 3,140 t CH4/yr", () => {
    expect(p.generationT).toBeCloseTo((500 * 0.717 * 8760) / 1000, 6);
    expect(Math.round(p.generationT)).toBe(3140);
  });
  it("captures about 2,355 t/yr at 75%", () => {
    expect(p.capturedT).toBeCloseTo(2355.5, 0);
  });
  it("avoids about 65,950 tCO2-e/yr at GWP100 = 28", () => {
    expect(p.abatedTCO2e).toBeCloseTo(65954, -1);
  });
  it("feeds about 3.74 MW thermal from captured gas only", () => {
    expect(p.thermalKW).toBeCloseTo(500 * 0.75 * 9.97, 6);
  });
  it("produces about 1.42 MW electric and 11.2 GWh/yr", () => {
    expect(p.electricKW).toBeCloseTo(1420.7, 0);
    expect(p.electricityMWh / 1000).toBeCloseTo(11.2, 1);
  });
});

describe("generation", () => {
  it("is zero with no waste", () => {
    expect(methaneGeneratedM3(site({ acceptance: [{ fromYear: 2000, toYear: 2030, tonnesPerYear: 0 }] }), 2028)).toBe(0);
  });
  it("matches a single-year hand calculation", () => {
    const s = site({ acceptance: [{ fromYear: 2020, toYear: 2020, tonnesPerYear: 1000 }] });
    expect(methaneGeneratedM3(s, 2022)).toBeCloseTo(0.05 * 100 * 1000 * Math.exp(-0.05 * 2.5), 9);
  });
  it("declines after closure", () => {
    const s = site({ acceptance: [{ fromYear: 1980, toYear: 2010, tonnesPerYear: 100000 }] });
    expect(methaneGeneratedM3(s, 2030)).toBeLessThan(methaneGeneratedM3(s, 2015));
  });
});

describe("project", () => {
  it("gives zero abatement when existing capture already meets the target", () => {
    const r = computeSite(site({ existingCapture: 0.8 }), a);
    expect(r.abatementToHorizonTCO2e).toBe(0);
    expect(r.netCostAudPerTCO2e).toBe(Infinity);
  });
  it("counts only incremental capture", () => {
    const none = computeSite(site(), a);
    const half = computeSite(site({ existingCapture: 0.5 }), a);
    expect(half.capturedTCH4PerYear).toBeCloseTo(none.capturedTCH4PerYear * (0.25 / 0.75), 6);
  });
  it("sums abatement only up to the horizon year", () => {
    const r = computeSite(site(), a);
    const expected = r.years.filter((y) => y.year <= 2035).reduce((s, y) => s + y.abatedTCO2e, 0);
    expect(r.abatementToHorizonTCO2e).toBeCloseTo(expected, 6);
    expect(r.years.length).toBe(15);
  });
  it("higher power price lowers cost per tonne", () => {
    const lo = computeSite(site(), { ...a, powerPriceAudPerMWh: 50 });
    const hi = computeSite(site(), { ...a, powerPriceAudPerMWh: 150 });
    expect(hi.netCostAudPerTCO2e).toBeLessThan(lo.netCostAudPerTCO2e);
  });
  it("credits ACCUs only above the method baseline", () => {
    const on = { ...a, includeAccu: true, accuPriceAud: 10, accuBaselineProportion: 0.35 };
    const r = computeSite(site({ existingCapture: 0 }), on);
    const expected = r.generationTCH4PerYear * (0.75 - 0.35) * 28 * 10;
    expect(r.annualAccuRevenueAud).toBeCloseTo(expected, 6);
    const above = computeSite(site({ existingCapture: 0.5 }), on);
    expect(above.annualAccuRevenueAud).toBeCloseTo(above.generationTCH4PerYear * 0.25 * 28 * 10, 6);
  });
  it("gives NZ sites no ACCU revenue", () => {
    const r = computeSite(site({ state: "NZ" }), { ...a, includeAccu: true });
    expect(r.annualAccuRevenueAud).toBe(0);
  });
  it("capex range brackets the mid estimate", () => {
    const r = computeSite(site(), a);
    expect(r.netCostAudPerTCO2eRange[0]).toBeLessThan(r.netCostAudPerTCO2e);
    expect(r.netCostAudPerTCO2eRange[1]).toBeGreaterThan(r.netCostAudPerTCO2e);
  });
});

describe("portfolio", () => {
  const fake = (id: string, cost: number, capex: number): SiteResult =>
    ({
      siteId: id,
      netCostAudPerTCO2e: cost,
      avgAbatementTCO2ePerYear: 100,
      abatementToHorizonTCO2e: 800,
      capexMidAud: capex,
    }) as SiteResult;
  const results = [fake("b", 20, 5), fake("a", -5, 10), fake("c", 50, 1)];

  it("sorts by cost per tonne", () => {
    expect(buildPortfolio(results, 0).bars.map((b) => b.siteId)).toEqual(["a", "b", "c"]);
  });
  it("funds nothing with zero budget", () => {
    expect(buildPortfolio(results, 0).fundedCount).toBe(0);
  });
  it("funds everything with unlimited budget", () => {
    const p = buildPortfolio(results, Infinity);
    expect(p.fundedCount).toBe(3);
    expect(p.fundedAbatementToHorizon).toBe(2400);
  });
  it("stops at the first site that does not fit", () => {
    const p = buildPortfolio(results, 12);
    expect(p.bars.map((b) => b.funded)).toEqual([true, false, false]);
    expect(p.fundedCapexAud).toBe(10);
  });
});
