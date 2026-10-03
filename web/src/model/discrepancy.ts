import { methaneGeneratedM3 } from "./generation";
import type { Assumptions, SatelliteResult, Site } from "./types";

// Simple mass balance linking an emission rate to the downwind-minus-upwind signal.
// Crosswind, a plume carries Q / u of methane per metre of travel. The pipeline
// averages pixels over a sector 10 to 30 km out and ±30° wide; averaged over that
// area, the plume is spread across an effective width of 2 · tan(30°) · 20 km.
// Screening physics only: no boundary layer, no chemistry, one source.
const SECONDS_PER_YEAR = 365.25 * 24 * 3600;
const CH4_KG_PER_MOL = 0.01604;
/** Moles of dry air above one square metre at sea-level pressure. */
const COLUMN_AIR_MOL_PER_M2 = 101_325 / 9.80665 / 0.0289644;
export const SECTOR_EFFECTIVE_WIDTH_M = 2 * Math.tan((30 * Math.PI) / 180) * 20_000;
/** Used when the satellite pipeline has not exported wind for a site. */
export const DEFAULT_WIND_MS = 5;

/** Sector-mean column enhancement (ppb) expected from a single source. */
export function ppbFromEmission(tCH4PerYear: number, windMs: number): number {
  const kgPerS = (tCH4PerYear * 1000) / SECONDS_PER_YEAR;
  const kgPerM2 = kgPerS / (windMs * SECTOR_EFFECTIVE_WIDTH_M);
  return (kgPerM2 / CH4_KG_PER_MOL / COLUMN_AIR_MOL_PER_M2) * 1e9;
}

/** Inverse of ppbFromEmission: the emission rate (t CH₄/yr) a signal would imply. */
export function emissionFromPpb(ppb: number, windMs: number): number {
  return ppb / ppbFromEmission(1, windMs);
}

export type Verdict = "consistent" | "higher" | "lower" | "no_data";

export type Comparison = {
  year: number;
  generationT: number;
  /** Methane the site emits on its reported figures (t CH₄/yr). */
  reportedEmissionT: number;
  reportedBasis: "reported" | "capture_claim";
  windMs: number;
  windAssumed: boolean;
  expectedPpb: number;
  observedPpb: number | null;
  observedCi: [number, number] | null;
  verdict: Verdict;
  /** Observed minus expected, ppb. */
  gapPpb: number | null;
  /** Emission rate the observed signal implies if the landfill were the only source, with its range. */
  impliedT: number | null;
  impliedTRange: [number, number] | null;
  /** True when the implied rate is more than the landfill generates at all, so other sources must contribute. */
  exceedsGeneration: boolean;
};

/** Compare what a site reports with what the satellite saw downwind of it. */
export function compareWithSatellite(site: Site, sat: SatelliteResult, a: Assumptions): Comparison {
  const year = sat.windowEnd ? Number(sat.windowEnd.slice(0, 4)) : 2025;
  const generationT = (methaneGeneratedM3(site, year) * a.methaneDensityKgPerM3) / 1000;
  const reported = site.reportedEmissions;
  const reportedEmissionT = reported ? reported.tCH4PerYear : generationT * (1 - site.existingCapture);
  const windAssumed = !sat.wind;
  const windMs = sat.wind?.meanSpeedMs ?? DEFAULT_WIND_MS;
  const expectedPpb = ppbFromEmission(reportedEmissionT, windMs);

  const base = {
    year,
    generationT,
    reportedEmissionT,
    reportedBasis: reported ? ("reported" as const) : ("capture_claim" as const),
    windMs,
    windAssumed,
    expectedPpb,
    observedPpb: sat.deltaPpb,
    observedCi: sat.ci95Ppb,
  };
  // Too few overpasses, or never run: nothing to compare against.
  if (sat.deltaPpb === null || !sat.ci95Ppb || sat.status === "not_run" || sat.overpassesUsed < 8) {
    return { ...base, verdict: "no_data", gapPpb: null, impliedT: null, impliedTRange: null, exceedsGeneration: false };
  }
  const [lo, hi] = sat.ci95Ppb;
  const verdict: Verdict = expectedPpb < lo ? "higher" : expectedPpb > hi ? "lower" : "consistent";
  const impliedT = Math.max(0, emissionFromPpb(sat.deltaPpb, windMs));
  return {
    ...base,
    verdict,
    gapPpb: sat.deltaPpb - expectedPpb,
    impliedT,
    impliedTRange: [Math.max(0, emissionFromPpb(lo, windMs)), Math.max(0, emissionFromPpb(hi, windMs))],
    exceedsGeneration: verdict === "higher" && impliedT > generationT,
  };
}
