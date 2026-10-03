// Pure helpers that turn Supabase rows into the app's types and merge them over the bundled seed data.
import type { SatelliteResult, Site } from "../model/types";

export type SatelliteState = "pending" | "running" | "done" | "failed";

/** A row of the Supabase `sites` table (snake_case, `l0` lower-cased). */
export type SiteRow = {
  id: string;
  name: string;
  state: Site["state"];
  lat: number;
  lon: number;
  acceptance: Site["acceptance"];
  k: number;
  l0: number;
  existing_capture: number;
  illustrative: boolean;
  reported_emissions: Site["reportedEmissions"] | null;
  notes: string;
  sources: string[];
  satellite_status: SatelliteState;
  error: string | null;
};

export type StatusInfo = { state: SatelliteState; error: string | null };

export function rowToSite(r: SiteRow): Site {
  const site: Site = {
    id: r.id,
    name: r.name,
    state: r.state,
    lat: r.lat,
    lon: r.lon,
    acceptance: r.acceptance,
    k: r.k,
    L0: r.l0,
    existingCapture: r.existing_capture,
    illustrative: r.illustrative,
    notes: r.notes,
    sources: r.sources,
  };
  if (r.reported_emissions) site.reportedEmissions = r.reported_emissions;
  return site;
}

/** Database rows win over seed entries with the same id; the seed keeps its order, new sites follow. */
export function mergeSites(seed: Site[], rows: SiteRow[]): Site[] {
  const byId = new Map(rows.map((r) => [r.id, rowToSite(r)]));
  const merged = seed.map((s) => byId.get(s.id) ?? s);
  const seedIds = new Set(seed.map((s) => s.id));
  const added = rows
    .filter((r) => !seedIds.has(r.id))
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((r) => byId.get(r.id)!);
  return [...merged, ...added];
}

/** Seed sites have finished results; a database row reports its own progress. */
export function statusMap(seed: Site[], rows: SiteRow[]): Record<string, StatusInfo> {
  const out: Record<string, StatusInfo> = Object.fromEntries(seed.map((s) => [s.id, { state: "done" as const, error: null }]));
  for (const r of rows) out[r.id] = { state: r.satellite_status, error: r.error };
  return out;
}

export function mergeById<T>(seed: Record<string, T>, rows: { site_id: string; data: T }[]): Record<string, T> {
  return { ...seed, ...Object.fromEntries(rows.map((r) => [r.site_id, r.data])) };
}

export const NOT_RUN: SatelliteResult = {
  status: "not_run",
  overpassesUsed: 0,
  windowStart: null,
  windowEnd: null,
  deltaPpb: null,
  ci95Ppb: null,
  confidence: null,
  note: "Satellite pipeline not run for this site.",
};
