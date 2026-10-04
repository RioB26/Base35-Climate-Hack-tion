import { describe, expect, it } from "vitest";
import { homesPerIcon, homesPowered } from "./homes";
import type { Site } from "./types";

const au = { state: "ACT" } as Site;
const nz = { state: "NZ" } as Site;

describe("homes powered", () => {
  it("uses 17 kWh a day in Australia and 8,000 kWh a year in New Zealand", () => {
    expect(homesPowered(6205, au)).toBeCloseTo(1000);
    expect(homesPowered(8000, nz)).toBeCloseTo(1000);
    expect(homesPowered(-5, au)).toBe(0);
    expect(homesPowered(8000, { state: "FJ" } as Site)).toBe(0);
  });

  it("keeps the infographic to 50 icons or fewer", () => {
    for (const homes of [3, 40, 499, 5900, 12_000, 140_000]) {
      const unit = homesPerIcon(homes);
      expect(Math.ceil(homes / unit)).toBeLessThanOrEqual(50);
    }
    expect(homesPerIcon(5900)).toBe(250);
  });
});
