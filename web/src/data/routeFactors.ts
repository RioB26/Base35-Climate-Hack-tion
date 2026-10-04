import type { Site } from "../model/types";

// PROVISIONAL screening values, being replaced with sourced figures (see docs/METHODOLOGY.md).

/** Grid electricity emission factors, t CO2-e per MWh. */
const GRID: Record<string, number> = { NSW: 0.66, ACT: 0.66, VIC: 0.77, QLD: 0.71, SA: 0.23, WA: 0.51, TAS: 0.15, NT: 0.54, NZ: 0.07, FJ: 0.5 };

export const gridFactorTPerMWh = (site: Pick<Site, "state">) => GRID[site.state] ?? 0.66;

export const GRID_SOURCE: Record<string, string> = {
  Australia: "NGA Factors",
  "New Zealand": "MfE",
  Fiji: "screening value",
};

/** Biomethane (upgraded landfill gas) assumptions. */
export const GAS = {
  /** Share of captured methane that reaches the gas grid after upgrading. */
  recovery: 0.95,
  /** Natural gas combustion emissions, t CO2-e per GJ. */
  combustionTPerGJ: 0.0515,
  /** Upgrading plant capital, AUD per m3/h of methane. */
  upgradingCapexAudPerM3hCH4: 12000,
  /** Upgrading running cost, AUD per GJ of biomethane. */
  upgradingOpexAudPerGJ: 6,
  /** Wholesale gas price, AUD per GJ. */
  priceAudPerGJ: 13,
};
