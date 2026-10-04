import { describe, expect, it } from "vitest";
import { compareSites } from "./compare";
import type { SiteResult } from "./types";

const fake = (id: string, cost: number, t: number, capex: number, opex = 10, revenue = 5): SiteResult =>
  ({
    siteId: id,
    netCostAudPerTCO2e: cost,
    avgAbatementTCO2ePerYear: t,
    capexMidAud: capex,
    annualOpexAud: opex,
    annualRevenueAud: revenue,
    simplePaybackYears: null,
  }) as SiteResult;

describe("compareSites", () => {
  it("treats costs within 10% of the cheapest as a tie and names the size leaders", () => {
    const c = compareSites([fake("big", 21, 800, 110), fake("small", 20, 180, 26), fake("mid", 20.5, 380, 52)], 15);
    expect(c.topId).toBe("small");
    expect(c.allTied).toBe(true);
    const row = (id: string) => c.rows.find((r) => r.siteId === id)!;
    expect(row("big").tiedWithTop).toBe(true);
    expect(row("small").strengths).toEqual(["first", "smallest"]);
    expect(row("big").strengths).toEqual(["most"]);
  });

  it("calls out a clear cost leader and explains the gap", () => {
    const c = compareSites([fake("cheap", 10, 100, 10), fake("dear", 40, 100, 40)], 10);
    expect(c.allTied).toBe(false);
    expect(c.rows[0].strengths).toContain("cheapest");
    expect(c.rows[1]).toMatchObject({ rank: 2, tiedWithTop: false, gapPerT: 30, driver: "capex" });
  });

  it("blames running costs when power covers less of them", () => {
    const c = compareSites([fake("a", 10, 100, 10, 10, 9), fake("b", 40, 100, 10, 40, 5)], 10);
    expect(c.rows[1].driver).toBe("running");
  });

  it("lists sites with nothing to fund last, unranked", () => {
    const c = compareSites([fake("done", Infinity, 0, 0), fake("a", 10, 100, 10)], 10);
    expect(c.rows.map((r) => [r.siteId, r.rank])).toEqual([["a", 1], ["done", null]]);
  });
});
