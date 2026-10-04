// Pure helpers that turn Supabase rows into the app's types and merge them over the bundled seed data.
import type { SatelliteResult, Site } from "../model/types";
import type { TanagerSite } from "./seed";

export type SatelliteState = "pending" | "running" | "done" | "failed" | "rejected";

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

/** `leave` is set when the problem cannot be fixed by editing the form, so the app sends the user home. */
export type AddSiteResponse<S extends { id: string }> = { ok: true; id: string; site?: S } | { ok: false; errors: string[]; leave?: boolean };

/** Maps the add-site reply. A 502 carries the saved id: the site exists (status failed), so it is not an error. */
export function mapAddSiteResponse<S extends { id: string }>(status: number, body: { errors?: string[]; error?: string; id?: string; site?: S }): AddSiteResponse<S> {
  if (status === 201 && body.site) return { ok: true, id: body.id ?? body.site.id, site: body.site };
  if (status === 502 && body.id) return { ok: true, id: body.id };
  const errors = body.errors ?? [body.error ?? `Something went wrong (${status}).`];
  // Invalid input, a wrong passcode and a duplicate name or nearby site are fixed in the form;
  // a rate limit or server error is not, so the user is sent home with the reason.
  return [400, 401, 409].includes(status) ? { ok: false, errors } : { ok: false, errors, leave: true };
}

/** A notice for the home page, shown when a site could not be added or was rejected. */
export type Notice = { title: string; message: string };

/** Rejected sites are removed by the database shortly after; the app never lists them. */
const isListed = (r: SiteRow) => r.satellite_status !== "rejected";

/** The notice for the first rejected site among `ownIds` (sites this browser added), or null. */
export function rejectionNotice(rows: SiteRow[], ownIds: Set<string>): { id: string; notice: Notice } | null {
  const r = rows.find((row) => row.satellite_status === "rejected" && ownIds.has(row.id));
  if (!r) return null;
  return {
    id: r.id,
    notice: {
      title: `We couldn't add ${r.name}`,
      message: `${r.error ?? "There was not enough satellite data to check this site."} The site was not added. You can try again with different coordinates.`,
    },
  };
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
export function mergeSites(seed: Site[], allRows: SiteRow[]): Site[] {
  const rows = allRows.filter(isListed);
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
export function statusMap(seed: Site[], allRows: SiteRow[]): Record<string, StatusInfo> {
  const rows = allRows.filter(isListed);
  const out: Record<string, StatusInfo> = Object.fromEntries(seed.map((s) => [s.id, { state: "done" as const, error: null, createdAt: null }]));
  for (const r of rows) out[r.id] = { state: r.satellite_status, error: r.error, createdAt: r.created_at };
  return out;
}

export function mergeById<T>(seed: Record<string, T>, rows: { site_id: string; data: T }[]): Record<string, T> {
  return { ...seed, ...Object.fromEntries(rows.map((r) => [r.site_id, r.data])) };
}

/** A stored plume record wins; otherwise a site still being processed shows "pending", else the bundled snapshot. */
export function resolveTanager(stored: TanagerSite | undefined, status: StatusInfo, bundled: TanagerSite): TanagerSite {
  if (stored) return stored;
  const inProgress = status.state === "pending" || status.state === "running";
  return inProgress && bundled.status === "not_checked" ? { ...bundled, status: "pending" } : bundled;
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
