import type { SatelliteResult, Site } from "../model/types";
import methaneGridData from "./methaneGrid.json";
import satelliteData from "./satellite.json";
import sitesData from "./sites.json";
import tanagerData from "./tanager.json";

export type MethaneGrid = Record<string, { windowStart: string; windowEnd: string; cells: [lat: number, lon: number, ppb: number][] }>;
export type TanagerObservation = {
  plumeId: string;
  instrument: string;
  gas: string;
  observedAt: string;
  lat: number;
  lon: number;
  emissionKgPerHour: number | null;
  emissionUncertaintyKgPerHour: number | null;
};
export type TanagerSite = {
  /** not_checked: the catalog was never searched for this site. pending: the search is still running. */
  status: "observed" | "no_public_coverage" | "not_checked" | "pending";
  sourceCount: number;
  plumeCount: number;
  observations: TanagerObservation[];
  coverageRadiusKm: number;
  catalogCheckedAt: string;
};

// Bundled seed data: the five original sites render from this immediately and whenever Supabase is
// unavailable. Sites added through the app live in Supabase; read everything through useData().
export const seedSites = sitesData as Site[];
export const seedGrid = methaneGridData as unknown as MethaneGrid;
export const seedSatellite = satelliteData as unknown as Record<string, SatelliteResult>;

const tanager = tanagerData as typeof tanagerData;

export const tanagerFor = (id: string): TanagerSite => {
  const known = tanager.sites[id as keyof typeof tanager.sites];
  return {
    ...(known ?? { status: "not_checked", sourceCount: 0, plumeCount: 0, observations: [] }),
    coverageRadiusKm: tanager.coverageRadiusKm,
    catalogCheckedAt: tanager.catalogCheckedAt,
  } as TanagerSite;
};

export const country = (s: Site) => (s.state === "NZ" ? "New Zealand" : "Australia");
export const regionOf = (s: Site) => (s.state === "NZ" ? "New Zealand" : `${s.state}, Australia`);
