import type { Site } from "./types";

// energy.gov.au, "Size your solar system": "On average, Australian homes use 11–23 kWh per day."
// We take the midpoint, 17 kWh a day.
export const AU_HOME_KWH_PER_YEAR = 17 * 365;
// MBIE Quarterly Survey of Domestic Electricity Prices models a household using about 8,000 kWh a year.
export const NZ_HOME_KWH_PER_YEAR = 8000;

export const homeKWhPerYear = (site: Site) => (site.state === "NZ" ? NZ_HOME_KWH_PER_YEAR : AU_HOME_KWH_PER_YEAR);

/** Typical homes the project's yearly electricity would supply. */
export const homesPowered = (electricityMWhPerYear: number, site: Site) =>
  Math.max(0, (electricityMWhPerYear * 1000) / homeKWhPerYear(site));

const UNITS = [1, 10, 50, 100, 250, 500, 1000, 2000, 5000, 10000, 25000, 50000];

/** Homes per house icon, chosen so the infographic shows at most 50 icons. */
export function homesPerIcon(homes: number): number {
  return UNITS.find((u) => homes / u <= 50) ?? Math.ceil(homes / 50);
}
