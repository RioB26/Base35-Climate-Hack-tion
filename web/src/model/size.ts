import { wasteAccepted } from "./generation";
import type { Site } from "./types";

export type SizeClass = "small" | "medium" | "large";

/** Modelled waste in place (tonnes) up to and including `year`. */
export function wasteInPlace(site: Site, year: number): number {
  const first = Math.min(...site.acceptance.map((p) => p.fromYear));
  let total = 0;
  for (let y = first; y <= year; y++) total += wasteAccepted(site, y);
  return total;
}

/** Size class for the 3D model: under 10 Mt in place is small, 30 Mt and over is large. */
export function sizeClass(site: Site, year: number): SizeClass {
  const t = wasteInPlace(site, year);
  return t < 10e6 ? "small" : t < 30e6 ? "medium" : "large";
}

/** True while the site still accepts waste in `year`. */
export function stillOperating(site: Site, year: number): boolean {
  return site.acceptance.some((p) => p.toYear >= year);
}
