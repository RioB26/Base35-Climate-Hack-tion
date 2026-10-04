import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { SatelliteResult, Site } from "../model/types";
import { seedGrid, seedSatellite, seedSites, type MethaneGrid } from "./seed";
import { mapAddSiteResponse, mergeById, mergeSites, NOT_RUN, statusMap, type SiteRow, type StatusInfo } from "./live";
import { SUPABASE_ANON_KEY, SUPABASE_URL, supabase } from "./supabase";

export type AddSiteInput = Record<string, unknown>;
export type AddSiteResult = { ok: true; id: string } | { ok: false; errors: string[] };

type DataState = {
  sites: Site[];
  satelliteFor: (id: string) => SatelliteResult;
  gridFor: (id: string) => MethaneGrid[string] | undefined;
  statusFor: (id: string) => StatusInfo;
  /** False when the build has no Supabase settings, so sites cannot be added. */
  canAdd: boolean;
  addSite: (input: AddSiteInput, passcode: string) => Promise<AddSiteResult>;
  retrySite: (id: string, passcode: string) => Promise<{ ok: true } | { ok: false; error: string }>;
};

const DataContext = createContext<DataState | null>(null);

type ResultRow<T> = { site_id: string; data: T };

export function DataProvider({ children }: { children: ReactNode }) {
  const [rows, setRows] = useState<SiteRow[]>([]);
  const [satRows, setSatRows] = useState<ResultRow<SatelliteResult>[]>([]);
  const [gridRows, setGridRows] = useState<ResultRow<MethaneGrid[string]>[]>([]);

  useEffect(() => {
    if (!supabase) return;
    const db = supabase;
    let disposed = false;
    // A failed read leaves the bundled seed data on screen, so errors are ignored on purpose.
    const load = <T,>(table: string, set: (v: T[]) => void) =>
      db.from(table).select("*").then(({ data }) => {
        if (!disposed && data) set(data as T[]);
      });
    const loaders = {
      sites: () => load<SiteRow>("sites", setRows),
      satellite_results: () => load<ResultRow<SatelliteResult>>("satellite_results", setSatRows),
      methane_grid: () => load<ResultRow<MethaneGrid[string]>>("methane_grid", setGridRows),
    };
    Object.values(loaders).forEach((f) => f());

    let channel = db.channel("live-data");
    for (const [table, reload] of Object.entries(loaders)) {
      channel = channel.on("postgres_changes", { event: "*", schema: "public", table }, reload);
    }
    channel.subscribe();
    return () => {
      disposed = true;
      db.removeChannel(channel);
    };
  }, []);

  const addSite = useCallback(async (input: AddSiteInput, passcode: string): Promise<AddSiteResult> => {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return { ok: false, errors: ["Adding sites is not set up in this build."] };
    let res: Response;
    try {
      res = await fetch(`${SUPABASE_URL}/functions/v1/add-site`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          "x-add-site-passcode": passcode,
        },
        body: JSON.stringify(input),
      });
    } catch {
      return { ok: false, errors: ["Could not reach the server. Check your connection and try again."] };
    }
    const body = await res.json().catch(() => ({}));
    const mapped = mapAddSiteResponse<Site>(res.status, body);
    if (!mapped.ok || !mapped.site) return mapped;
    // Show the site at once; realtime then streams the satellite status.
    const s = mapped.site;
    setRows((prev) => [
      ...prev.filter((r) => r.id !== s.id),
      {
        id: s.id, name: s.name, state: s.state, lat: s.lat, lon: s.lon, acceptance: s.acceptance, k: s.k, l0: s.L0,
        existing_capture: s.existingCapture, illustrative: true, reported_emissions: null, notes: s.notes,
        sources: s.sources, satellite_status: "running", error: null, created_at: new Date().toISOString(),
      },
    ]);
    return { ok: true, id: s.id };
  }, []);

  const retrySite = useCallback(async (id: string, passcode: string) => {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return { ok: false as const, error: "Retry is not set up in this build." };
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/retry-site`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          "x-add-site-passcode": passcode,
        },
        body: JSON.stringify({ id }),
      });
      if (res.ok) return { ok: true as const };
      const body = await res.json().catch(() => ({}));
      return { ok: false as const, error: body.error ?? `Something went wrong (${res.status}).` };
    } catch {
      return { ok: false as const, error: "Could not reach the server. Check your connection and try again." };
    }
  }, []);

  const value = useMemo<DataState>(() => {
    const sites = mergeSites(seedSites, rows);
    const satellite = mergeById(seedSatellite, satRows);
    const grids = mergeById(seedGrid, gridRows);
    const status = statusMap(seedSites, rows);
    return {
      sites,
      satelliteFor: (id) => satellite[id] ?? NOT_RUN,
      gridFor: (id) => grids[id],
      statusFor: (id) => status[id] ?? { state: "done", error: null, createdAt: null },
      canAdd: supabase !== null,
      addSite,
      retrySite,
    };
  }, [rows, satRows, gridRows, addSite, retrySite]);

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataState {
  const v = useContext(DataContext);
  if (!v) throw new Error("useData must be used inside DataProvider");
  return v;
}
