import type { SatelliteResult, Site } from "../model/types";
import methaneGridData from "./methaneGrid.json";
import satelliteData from "./satellite.json";
import sitesData from "./sites.json";

export type MethaneGrid = Record<string, { windowStart: string; windowEnd: string; cells: [lat: number, lon: number, ppb: number][] }>;

// Adding a landfill is a data change only: a row in sites.json, then run the satellite pipeline.
export const sites = sitesData as Site[];
export const methaneGrid = methaneGridData as unknown as MethaneGrid;
const satellite = satelliteData as unknown as Record<string, SatelliteResult>;

const notRun: SatelliteResult = {
  status: "not_run",
  overpassesUsed: 0,
  windowStart: null,
  windowEnd: null,
  deltaPpb: null,
  ci95Ppb: null,
  confidence: null,
  note: "Satellite pipeline not run for this site.",
};

export const satelliteFor = (id: string): SatelliteResult => satellite[id] ?? notRun;

export const country = (s: Site) => (s.state === "NZ" ? "New Zealand" : "Australia");
export const regionOf = (s: Site) => (s.state === "NZ" ? "New Zealand" : `${s.state}, Australia`);
