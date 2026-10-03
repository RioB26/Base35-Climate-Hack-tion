import type { SatelliteResult, Site } from "../model/types";
import methaneGridData from "./methaneGrid.json";
import satelliteData from "./satellite.json";
import sitesData from "./sites.json";

export type MethaneGrid = Record<string, { windowStart: string; windowEnd: string; cells: [lat: number, lon: number, ppb: number][] }>;

// Bundled seed data: the five original sites render from this immediately and whenever Supabase is
// unavailable. Sites added through the app live in Supabase; read everything through useData().
export const seedSites = sitesData as Site[];
export const seedGrid = methaneGridData as unknown as MethaneGrid;
export const seedSatellite = satelliteData as unknown as Record<string, SatelliteResult>;

export const country = (s: Site) => (s.state === "NZ" ? "New Zealand" : "Australia");
export const regionOf = (s: Site) => (s.state === "NZ" ? "New Zealand" : `${s.state}, Australia`);
