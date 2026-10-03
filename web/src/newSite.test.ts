import { describe, expect, it } from "vitest";
import { DEFAULTS, distanceKm, slugify, validateNewSite } from "../../supabase/functions/add-site/validate";

const good = {
  name: "Spring Farm Landfill",
  state: "NSW",
  lat: -34.05,
  lon: 150.7,
  acceptance: [{ fromYear: 2000, toYear: 2030, tonnesPerYear: 200000 }],
};

describe("validateNewSite", () => {
  it("accepts a minimal site and applies defaults", () => {
    const r = validateNewSite(good);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.site.id).toBe("spring-farm-landfill");
    expect(r.site).toMatchObject({ ...DEFAULTS, illustrative: true, sources: [] });
  });

  it("rejects coordinates outside the chosen country", () => {
    const r = validateNewSite({ ...good, lat: 51.5, lon: -0.12 });
    expect(r.ok).toBe(false);
    const nz = validateNewSite({ ...good, state: "NZ" });
    expect(nz.ok).toBe(false);
  });

  it("accepts a New Zealand site in the NZ box", () => {
    expect(validateNewSite({ ...good, state: "NZ", lat: -41.3, lon: 174.8 }).ok).toBe(true);
  });

  it("rejects bad acceptance periods and parameters", () => {
    expect(validateNewSite({ ...good, acceptance: [] }).ok).toBe(false);
    expect(validateNewSite({ ...good, acceptance: [{ fromYear: 2030, toYear: 2000, tonnesPerYear: 1 }] }).ok).toBe(false);
    expect(validateNewSite({ ...good, acceptance: [{ fromYear: 2000, toYear: 2030, tonnesPerYear: 0 }] }).ok).toBe(false);
    expect(validateNewSite({ ...good, k: 2 }).ok).toBe(false);
    expect(validateNewSite({ ...good, existingCapture: 1.5 }).ok).toBe(false);
    expect(validateNewSite({ ...good, state: "XX" }).ok).toBe(false);
    expect(validateNewSite({ ...good, name: "!!" }).ok).toBe(false);
  });

  it("rejects non-object input", () => {
    expect(validateNewSite(null).ok).toBe(false);
    expect(validateNewSite("x").ok).toBe(false);
  });

  it("keeps a supplied source and note", () => {
    const r = validateNewSite({ ...good, source: "https://example.org/report", notes: "From council data." });
    expect(r.ok && r.site.sources).toEqual(["https://example.org/report"]);
    expect(r.ok && r.site.notes).toContain("From council data.");
  });
});

describe("helpers", () => {
  it("slugifies", () => expect(slugify("  Mugga Lane (ACT)! ")).toBe("mugga-lane-act"));
  it("measures distance", () => {
    expect(distanceKm(-33.8, 150.9, -33.8, 150.9)).toBe(0);
    expect(distanceKm(-33.87, 151.21, -37.81, 144.96)).toBeGreaterThan(700);
  });
});
