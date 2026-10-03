import type { Site } from "./types";

/** Tonnes of waste the site accepts in a given year. */
export function wasteAccepted(site: Site, year: number): number {
  return site.acceptance
    .filter((p) => year >= p.fromYear && year <= p.toYear)
    .reduce((sum, p) => sum + p.tonnesPerYear, 0);
}

/**
 * Methane generated in `year` (m3 CH4/yr), first-order decay, LandGEM-style.
 * Each year's waste i contributes k * L0 * M_i * exp(-k * age), with age taken
 * at mid-year (t - i + 0.5) so waste placed this year already starts decaying.
 */
export function methaneGeneratedM3(site: Site, year: number): number {
  const first = Math.min(...site.acceptance.map((p) => p.fromYear));
  let total = 0;
  for (let i = first; i <= year; i++) {
    const m = wasteAccepted(site, i);
    if (m > 0) total += site.k * site.L0 * m * Math.exp(-site.k * (year - i + 0.5));
  }
  return total;
}
