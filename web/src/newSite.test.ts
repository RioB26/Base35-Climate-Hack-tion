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

  it("rejects overlapping and widely gapped acceptance periods", () => {
    const overlap = validateNewSite({
      ...good,
      acceptance: [
        { fromYear: 1990, toYear: 2005, tonnesPerYear: 1000 },
        { fromYear: 2005, toYear: 2020, tonnesPerYear: 1000 },
      ],
    });
    expect(!overlap.ok && overlap.errors.join(" ")).toContain("overlap");
    const gap = validateNewSite({
      ...good,
      acceptance: [
        { fromYear: 1950, toYear: 1960, tonnesPerYear: 1000 },
        { fromYear: 2000, toYear: 2010, tonnesPerYear: 1000 },
      ],
    });
    expect(!gap.ok && gap.errors.join(" ")).toContain("gap");
    const adjacent = validateNewSite({
      ...good,
      acceptance: [
        { fromYear: 1990, toYear: 2004, tonnesPerYear: 1000 },
        { fromYear: 2005, toYear: 2020, tonnesPerYear: 1000 },
      ],
    });
    expect(adjacent.ok).toBe(true);
  });

  it("rejects tiny tonnages, swapped or zero coordinates and too-short names", () => {
    expect(validateNewSite({ ...good, acceptance: [{ fromYear: 2000, toYear: 2010, tonnesPerYear: 5 }] }).ok).toBe(false);
    const swapped = validateNewSite({ ...good, lat: 150.7, lon: -34.05 });
    expect(!swapped.ok && swapped.errors.join(" ")).toContain("swapped");
    const zero = validateNewSite({ ...good, lat: 0, lon: 0 });
    expect(!zero.ok && zero.errors.join(" ")).toContain("0, 0");
    expect(validateNewSite({ ...good, name: "!a!" }).ok).toBe(false);
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

describe("validateNewSite boundaries", () => {
  const periods = (...p: [number, number][]) => p.map(([fromYear, toYear]) => ({ fromYear, toYear, tonnesPerYear: 1000 }));

  it("applies the tonnage floor exactly at 100 t/yr", () => {
    expect(validateNewSite({ ...good, acceptance: [{ fromYear: 2000, toYear: 2010, tonnesPerYear: 100 }] }).ok).toBe(true);
    expect(validateNewSite({ ...good, acceptance: [{ fromYear: 2000, toYear: 2010, tonnesPerYear: 99 }] }).ok).toBe(false);
    expect(validateNewSite({ ...good, acceptance: [{ fromYear: 2000, toYear: 2010, tonnesPerYear: 1e8 + 1 }] }).ok).toBe(false);
  });

  it("allows a gap of 20 years but not 21, whatever order the periods are given in", () => {
    expect(validateNewSite({ ...good, acceptance: periods([2021, 2030], [1980, 2000]) }).ok).toBe(true);
    expect(validateNewSite({ ...good, acceptance: periods([2022, 2030], [1980, 2000]) }).ok).toBe(false);
  });

  it("detects an overlap between non-adjacent entries once sorted", () => {
    const r = validateNewSite({ ...good, acceptance: periods([2010, 2020], [1990, 2000], [1995, 2012]) });
    expect(!r.ok && r.errors.join(" ")).toContain("overlap");
  });

  it("catches an overlap or gap hidden behind a long period that contains another", () => {
    const nested = validateNewSite({ ...good, acceptance: periods([2000, 2050], [2010, 2020], [2030, 2040]) });
    expect(!nested.ok && nested.errors.join(" ")).toContain("overlap");
    const gap = validateNewSite({ ...good, acceptance: periods([1900, 1950], [1910, 1920], [1990, 2000]) });
    expect(!gap.ok && gap.errors.join(" ")).toContain("gap");
  });

  it("does not report overlaps when a period is itself invalid", () => {
    const r = validateNewSite({ ...good, acceptance: [...periods([1990, 2005]), { fromYear: 2000, toYear: 1999, tonnesPerYear: 1000 }] });
    expect(r.ok).toBe(false);
    expect(!r.ok && r.errors.join(" ")).not.toContain("overlap");
  });

  it("allows single-year periods and a period that touches the next", () => {
    expect(validateNewSite({ ...good, acceptance: periods([2000, 2000], [2001, 2001]) }).ok).toBe(true);
  });

  it("rejects more than 6 periods and non-integer years", () => {
    expect(validateNewSite({ ...good, acceptance: periods([1990, 1991], [1992, 1993], [1994, 1995], [1996, 1997], [1998, 1999], [2000, 2001], [2002, 2003]) }).ok).toBe(false);
    expect(validateNewSite({ ...good, acceptance: [{ fromYear: 2000.5, toYear: 2010, tonnesPerYear: 1000 }] }).ok).toBe(false);
  });

  it("checks coordinates against each country's box, including Fiji", () => {
    expect(validateNewSite({ ...good, state: "FJ", lat: -18.1, lon: 178.4 }).ok).toBe(true);
    expect(validateNewSite({ ...good, state: "FJ", lat: -33.8, lon: 150.9 }).ok).toBe(false);
    expect(validateNewSite({ ...good, lat: "-34", lon: 150 }).ok).toBe(false);
    expect(validateNewSite({ ...good, lat: NaN }).ok).toBe(false);
  });

  it("reports every problem at once", () => {
    const r = validateNewSite({ name: "", state: "XX", lat: 0, lon: 0, acceptance: [] });
    expect(!r.ok && r.errors.length).toBeGreaterThanOrEqual(4);
  });

  it("enforces parameter ranges and trims long free text", () => {
    expect(validateNewSite({ ...good, k: 0 }).ok).toBe(false);
    expect(validateNewSite({ ...good, k: 1 }).ok).toBe(false);
    expect(validateNewSite({ ...good, L0: 301 }).ok).toBe(false);
    expect(validateNewSite({ ...good, existingCapture: 0 }).ok).toBe(true);
    expect(validateNewSite({ ...good, existingCapture: 1 }).ok).toBe(true);
    const r = validateNewSite({ ...good, notes: "n".repeat(900), source: "s".repeat(900) });
    expect(r.ok && r.site.sources[0].length).toBe(300);
    expect(r.ok && r.site.notes.length).toBeLessThan(700);
  });

  it("trims the name before slugging it", () => {
    const r = validateNewSite({ ...good, name: "  Mugga Lane (ACT)  " });
    expect(r.ok && r.site.id).toBe("mugga-lane-act");
    expect(r.ok && r.site.name).toBe("Mugga Lane (ACT)");
  });
});

describe("helpers", () => {
  it("slugifies", () => expect(slugify("  Mugga Lane (ACT)! ")).toBe("mugga-lane-act"));
  it("measures distance", () => {
    expect(distanceKm(-33.8, 150.9, -33.8, 150.9)).toBe(0);
    expect(distanceKm(-33.87, 151.21, -37.81, 144.96)).toBeGreaterThan(700);
  });
});
