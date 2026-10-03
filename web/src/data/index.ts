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
  status: "observed" | "no_public_coverage";
  sourceCount: number;
  plumeCount: number;
  observations: TanagerObservation[];
  coverageRadiusKm: number;
  catalogCheckedAt: string;
};

// Adding a landfill is a data change only: a row in sites.json, then run the satellite pipeline.
export const sites = sitesData as Site[];
export const methaneGrid = methaneGridData as unknown as MethaneGrid;
const tanager = tanagerData as typeof tanagerData;
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
export const tanagerFor = (id: string): TanagerSite =>
  ({
    ...(tanager.sites[id as keyof typeof tanager.sites] ?? {
      status: "no_public_coverage",
      sourceCount: 0,
      plumeCount: 0,
      observations: [],
    }),
    coverageRadiusKm: tanager.coverageRadiusKm,
    catalogCheckedAt: tanager.catalogCheckedAt,
  }) as TanagerSite;

export const country = (s: Site) => (s.state === "NZ" ? "New Zealand" : "Australia");
export const regionOf = (s: Site) => (s.state === "NZ" ? "New Zealand" : `${s.state}, Australia`);
