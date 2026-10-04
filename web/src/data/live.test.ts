import { describe, expect, it } from "vitest";
import type { Site } from "../model/types";
import type { TanagerSite } from "./seed";
import { isSlow, mapAddSiteResponse, mergeById, mergeSites, resolveTanager, rowToSite, statusMap, type SiteRow } from "./live";

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
  created_at: "2026-10-04T00:00:00Z",
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
    expect(st.a).toEqual({ state: "done", error: null, createdAt: null });
    expect(st["new-site"]).toEqual({ state: "failed", error: "boom", createdAt: "2026-10-04T00:00:00Z" });
  });

  it("merges result tables over the seed", () => {
    expect(mergeById({ a: 1 }, [{ site_id: "b", data: 2 }, { site_id: "a", data: 3 }])).toEqual({ a: 3, b: 2 });
  });
});

describe("add-site response mapping", () => {
  it("accepts a 201 with the site", () => {
    expect(mapAddSiteResponse(201, { id: "x", site: { id: "x" } })).toEqual({ ok: true, id: "x", site: { id: "x" } });
  });
  it("treats a 502 with an id as saved, so the failed row shows on Check", () => {
    expect(mapAddSiteResponse(502, { error: "could not start", id: "x" })).toEqual({ ok: true, id: "x" });
  });
  it("returns validation errors, or a fallback message", () => {
    expect(mapAddSiteResponse(400, { errors: ["bad"] })).toEqual({ ok: false, errors: ["bad"] });
    expect(mapAddSiteResponse(409, { error: "exists" })).toEqual({ ok: false, errors: ["exists"] });
    expect(mapAddSiteResponse(500, {})).toEqual({ ok: false, errors: ["Something went wrong (500)."] });
  });
});

describe("isSlow", () => {
  const now = Date.parse("2026-10-04T01:00:00Z");
  it("flags running sites older than 15 minutes only", () => {
    expect(isSlow({ state: "running", error: null, createdAt: "2026-10-04T00:30:00Z" }, now)).toBe(true);
    expect(isSlow({ state: "running", error: null, createdAt: "2026-10-04T00:50:00Z" }, now)).toBe(false);
    expect(isSlow({ state: "done", error: null, createdAt: "2026-10-04T00:00:00Z" }, now)).toBe(false);
    expect(isSlow({ state: "running", error: null, createdAt: null }, now)).toBe(false);
  });
});

describe("resolveTanager", () => {
  const bundled: TanagerSite = { status: "not_checked", sourceCount: 0, plumeCount: 0, observations: [], coverageRadiusKm: 15, catalogCheckedAt: "2026-10-04" };
  const stored: TanagerSite = { ...bundled, status: "observed", plumeCount: 1 };
  const state = (s: "pending" | "running" | "done" | "failed") => ({ state: s, error: null, createdAt: null });

  it("prefers the stored record", () => {
    expect(resolveTanager(stored, state("running"), bundled)).toBe(stored);
  });
  it("shows pending while the job runs and nothing is stored", () => {
    expect(resolveTanager(undefined, state("running"), bundled).status).toBe("pending");
    expect(resolveTanager(undefined, state("pending"), bundled).status).toBe("pending");
  });
  it("falls back to the bundled snapshot once finished or failed", () => {
    expect(resolveTanager(undefined, state("done"), bundled)).toBe(bundled);
    expect(resolveTanager(undefined, state("failed"), bundled)).toBe(bundled);
  });
  it("keeps a bundled result even while running", () => {
    const seeded: TanagerSite = { ...bundled, status: "no_public_coverage" };
    expect(resolveTanager(undefined, state("running"), seeded)).toBe(seeded);
  });
});
