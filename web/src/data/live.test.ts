import { describe, expect, it } from "vitest";
import type { Site } from "../model/types";
import { mergeById, mergeSites, rowToSite, statusMap, type SiteRow } from "./live";

const seed: Site[] = [
  { id: "b", name: "B", state: "NSW", lat: -34, lon: 151, acceptance: [], k: 0.05, L0: 100, existingCapture: 0.4, illustrative: false, notes: "", sources: [] },
  { id: "a", name: "A", state: "VIC", lat: -37, lon: 144, acceptance: [], k: 0.05, L0: 100, existingCapture: 0.1, illustrative: false, notes: "", sources: [] },
];

const row = (over: Partial<SiteRow> = {}): SiteRow => ({
  id: "new-site",
  name: "New site",
  state: "QLD",
  lat: -27.5,
  lon: 153,
  acceptance: [{ fromYear: 2000, toYear: 2030, tonnesPerYear: 1e5 }],
  k: 0.04,
  l0: 90,
  existing_capture: 0.2,
  illustrative: true,
  reported_emissions: null,
  notes: "n",
  sources: [],
  satellite_status: "running",
  error: null,
  ...over,
});

describe("live data merge", () => {
  it("maps a row to a Site, renaming l0 and existing_capture", () => {
    const s = rowToSite(row());
    expect(s).toMatchObject({ L0: 90, existingCapture: 0.2, illustrative: true });
    expect(s).not.toHaveProperty("reportedEmissions");
  });

  it("keeps reported emissions when present", () => {
    const re = { tCH4PerYear: 100, year: 2023, source: "x" };
    expect(rowToSite(row({ reported_emissions: re })).reportedEmissions).toEqual(re);
  });

  it("keeps seed order, lets rows override, and appends new sites", () => {
    const merged = mergeSites(seed, [row(), row({ id: "a", name: "A (db)" })]);
    expect(merged.map((s) => s.id)).toEqual(["b", "a", "new-site"]);
    expect(merged[1].name).toBe("A (db)");
  });

  it("returns the seed when there are no rows", () => {
    expect(mergeSites(seed, [])).toEqual(seed);
  });

  it("reports seed sites as done and database sites by their own status", () => {
    const st = statusMap(seed, [row({ satellite_status: "failed", error: "boom" })]);
    expect(st.a).toEqual({ state: "done", error: null });
    expect(st["new-site"]).toEqual({ state: "failed", error: "boom" });
  });

  it("merges result tables over the seed", () => {
    expect(mergeById({ a: 1 }, [{ site_id: "b", data: 2 }, { site_id: "a", data: 3 }])).toEqual({ a: 3, b: 2 });
  });
});
