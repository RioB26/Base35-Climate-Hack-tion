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
  created_at: string;
};

export type StatusInfo = { state: SatelliteState; error: string | null; createdAt: string | null };

export const SLOW_AFTER_MS = 15 * 60_000;

/** True once a site has been waiting on the satellite job longer than expected. */
export function isSlow(status: StatusInfo, now: number): boolean {
  if (status.state !== "running" && status.state !== "pending") return false;
  if (!status.createdAt) return false;
  return now - Date.parse(status.createdAt) > SLOW_AFTER_MS;
}

export type AddSiteResponse<S extends { id: string }> = { ok: true; id: string; site?: S } | { ok: false; errors: string[] };

/** Maps the add-site reply. A 502 carries the saved id: the site exists (status failed), so it is not an error. */
export function mapAddSiteResponse<S extends { id: string }>(status: number, body: { errors?: string[]; error?: string; id?: string; site?: S }): AddSiteResponse<S> {
  if (status === 201 && body.site) return { ok: true, id: body.id ?? body.site.id, site: body.site };
  if (status === 502 && body.id) return { ok: true, id: body.id };
  return { ok: false, errors: body.errors ?? [body.error ?? `Something went wrong (${status}).`] };
}

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
  const out: Record<string, StatusInfo> = Object.fromEntries(seed.map((s) => [s.id, { state: "done" as const, error: null, createdAt: null }]));
  for (const r of rows) out[r.id] = { state: r.satellite_status, error: r.error, createdAt: r.created_at };
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
