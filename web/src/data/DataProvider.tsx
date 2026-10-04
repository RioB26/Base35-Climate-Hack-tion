import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { SatelliteResult, Site } from "../model/types";
import { seedGrid, seedSatellite, seedSites, tanagerFor as bundledTanager, type MethaneGrid, type TanagerSite } from "./seed";
import { mapAddSiteResponse, mergeById, mergeSites, NOT_RUN, rejectionNotice, resolveTanager, statusMap, type Notice, type SiteRow, type StatusInfo } from "./live";
import { SUPABASE_ANON_KEY, SUPABASE_URL, supabase } from "./supabase";

export type AddSiteInput = Record<string, unknown>;
export type AddSiteResult = { ok: true; id: string } | { ok: false; errors: string[]; leave?: boolean };

const NOTICE_KEY = "site-notice";
const OWN_KEY = "added-site-ids";

// sessionStorage can throw (private windows, blocked storage); the notice just won't survive a reload then.
function readStored<T>(key: string, fallback: T): T {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function writeStored(key: string, value: unknown) {
  try {
    if (value === null) sessionStorage.removeItem(key);
    else sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

type DataState = {
  sites: Site[];
  satelliteFor: (id: string) => SatelliteResult;
  gridFor: (id: string) => MethaneGrid[string] | undefined;
  statusFor: (id: string) => StatusInfo;
  tanagerFor: (id: string) => TanagerSite;
  /** False when the build has no Supabase settings, so sites cannot be added. */
  canAdd: boolean;
  addSite: (input: AddSiteInput, passcode: string) => Promise<AddSiteResult>;
  retrySite: (id: string, passcode: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  /** Why a site could not be added, shown on the home page until dismissed. */
  notice: Notice | null;
  dismissNotice: () => void;
};

const DataContext = createContext<DataState | null>(null);

/** A tanager_results row's data: a TanagerSite without the fields the bundled helper adds. */
type StoredTanager = Omit<TanagerSite, "coverageRadiusKm" | "catalogCheckedAt"> & Partial<Pick<TanagerSite, "coverageRadiusKm" | "catalogCheckedAt">>;

type ResultRow<T> = { site_id: string; data: T };

export function DataProvider({ children }: { children: ReactNode }) {
  const [rows, setRows] = useState<SiteRow[]>([]);
  const [satRows, setSatRows] = useState<ResultRow<SatelliteResult>[]>([]);
  const [gridRows, setGridRows] = useState<ResultRow<MethaneGrid[string]>[]>([]);
  const [tanagerRows, setTanagerRows] = useState<ResultRow<StoredTanager>[]>([]);
  const [notice, setNotice] = useState<Notice | null>(() => readStored<Notice | null>(NOTICE_KEY, null));

  const showNotice = useCallback((n: Notice | null) => {
    setNotice(n);
    writeStored(NOTICE_KEY, n);
  }, []);

  // A site this browser added can be rejected once the satellite job finds too little data. Tell the
  // user why and, if they had opened that site, send them back to the home page.
  useEffect(() => {
    const own = new Set(readStored<string[]>(OWN_KEY, []));
    const hit = rejectionNotice(rows, own);
    if (!hit) return;
    own.delete(hit.id);
    writeStored(OWN_KEY, [...own]);
    showNotice(hit.notice);
    if (window.location.hash.startsWith(`#/site/${hit.id}/`)) window.location.hash = "#/";
  }, [rows, showNotice]);

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
      tanager_results: () => load<ResultRow<StoredTanager>>("tanager_results", setTanagerRows),
    };
    const reloadAll = () => Object.values(loaders).forEach((f) => f());
    reloadAll();

    // The job writes results, then flips the site to done. Any change reloads every table, so a done
    // status never sits beside results the browser missed or received out of order.
    let channel = db.channel("live-data");
    for (const table of Object.keys(loaders)) {
      channel = channel.on("postgres_changes", { event: "*", schema: "public", table }, reloadAll);
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
    if (!mapped.ok) {
      if (mapped.leave) showNotice({ title: "We couldn't add that landfill", message: mapped.errors.join(" ") });
      return mapped;
    }
    writeStored(OWN_KEY, [...new Set([...readStored<string[]>(OWN_KEY, []), mapped.id])]);
    if (!mapped.site) return mapped;
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
  }, [showNotice]);

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
    const tanager = mergeById<StoredTanager>({}, tanagerRows);
    return {
      sites,
      satelliteFor: (id) => satellite[id] ?? NOT_RUN,
      gridFor: (id) => grids[id],
      statusFor: (id) => status[id] ?? { state: "done", error: null, createdAt: null },
      tanagerFor: (id) => {
        const bundled = bundledTanager(id);
        const stored = tanager[id];
        const full = stored && { ...bundled, ...stored, coverageRadiusKm: stored.coverageRadiusKm ?? bundled.coverageRadiusKm, catalogCheckedAt: stored.catalogCheckedAt ?? bundled.catalogCheckedAt };
        return resolveTanager(full, status[id] ?? { state: "done", error: null, createdAt: null }, bundled);
      },
      canAdd: supabase !== null,
      addSite,
      retrySite,
      notice,
      dismissNotice: () => showNotice(null),
    };
  }, [rows, satRows, gridRows, tanagerRows, addSite, retrySite, notice, showNotice]);

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataState {
  const v = useContext(DataContext);
  if (!v) throw new Error("useData must be used inside DataProvider");
  return v;
}
