import { describe, expect, it } from "vitest";
import { seedSites } from "../data/seed";
import { defaultAssumptions as a } from "../data/assumptions";
import { country, creditScheme, inAustralia } from "./country";
import { computeSite, potentialAccuAud } from "./project";

const naboro = seedSites.find((s) => s.id === "naboro")!;

describe("countries", () => {
  it("names each country and its credit scheme", () => {
    expect([country({ state: "VIC" }), country({ state: "NZ" }), country({ state: "FJ" })]).toEqual(["Australia", "New Zealand", "Fiji"]);
    expect([creditScheme({ state: "ACT" }), creditScheme({ state: "NZ" }), creditScheme({ state: "FJ" })]).toEqual(["ACCUs", "NZ ETS", "None"]);
    expect(inAustralia({ state: "FJ" })).toBe(false);
  });

  it("gives Naboro, with no capture today, a project but no Australian credits", () => {
    expect(naboro.existingCapture).toBe(0);
    const r = computeSite(naboro, a);
    expect(Number.isFinite(r.netCostAudPerTCO2e)).toBe(true);
    expect(r.capturedTCH4PerYear).toBeGreaterThan(0);
    expect(potentialAccuAud(naboro, r.generationTCH4PerYear, a)).toBe(0);
  });
});
