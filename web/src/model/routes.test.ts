import { describe, expect, it } from "vitest";
import { seedSites } from "../data/seed";
import { defaultAssumptions as a } from "../data/assumptions";
import { computeSite } from "./project";
import { gasRoutes } from "./routes";

const site = (id: string) => seedSites.find((s) => s.id === id)!;
const route = (id: string, r: string) => gasRoutes(site(id), a).find((x) => x.id === r)!;

describe("gas routes", () => {
  it("matches the main model for the electricity route", () => {
    const main = computeSite(site("mugga-lane"), a);
    const power = route("mugga-lane", "power");
    expect(power.capexMidAud).toBeCloseTo(main.capexMidAud);
    expect(power.netCostAudPerTCO2e).toBeCloseTo(main.netCostAudPerTCO2e);
    expect(power.annualRevenueAud).toBeCloseTo(main.annualRevenueAud);
  });

  it("cuts the same methane every way, but only energy routes replace fossil emissions", () => {
    const [flare, power, bio] = ["flare", "power", "biomethane"].map((r) => route("mugga-lane", r));
    expect(flare.methaneCutTCO2ePerYear).toBeCloseTo(power.methaneCutTCO2ePerYear);
    expect(bio.methaneCutTCO2ePerYear).toBeCloseTo(power.methaneCutTCO2ePerYear);
    expect(flare.displacedTCO2ePerYear).toBe(0);
    expect(power.displacedTCO2ePerYear).toBeGreaterThan(0);
    expect(bio.displacedTCO2ePerYear).toBeGreaterThan(0);
    expect(flare.capexMidAud).toBeLessThan(power.capexMidAud);
    expect(flare.energy).toBeNull();
  });

  it("leaves out the grid saving in Fiji, where no factor is published", () => {
    expect(route("naboro", "power").displacedTCO2ePerYear).toBe(0);
    expect(route("naboro", "biomethane").displacedTCO2ePerYear).toBeGreaterThan(0);
  });

  it("offers only 'leave it' when there is no headroom", () => {
    expect(gasRoutes(site("redvale"), a).map((x) => x.id)).toEqual(["none"]);
  });
});
