import type { Site } from "./types";

export const inAustralia = (s: Pick<Site, "state">) => s.state !== "NZ" && s.state !== "FJ";

export const country = (s: Pick<Site, "state">) =>
  s.state === "NZ" ? "New Zealand" : s.state === "FJ" ? "Fiji" : "Australia";

/** The carbon scheme a site sits under, for labels. Only Australia's ACCUs are modelled. */
export const creditScheme = (s: Pick<Site, "state">) => (s.state === "NZ" ? "NZ ETS" : s.state === "FJ" ? "None" : "ACCUs");
