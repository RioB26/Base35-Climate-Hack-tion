import type { Site } from "../model/types";

// Figures for comparing what a site does with its gas (Plan step). Sources in docs/METHODOLOGY.md §11.

const AUD_PER_USD_2026 = 1.5 * 1.25; // same team FX and 2020→2026 escalation as assumptions.ts
// 600 scfm of landfill gas ≈ 510 m³/h of methane (assumptions.ts), so 1 m³/h CH4 ≈ 1.18 scfm.
const SCFM_PER_M3H_CH4 = 600 / 510;

/**
 * Grid electricity emission factors, t CO2-e per MWh.
 * Australia: NGA Factors 2024 (DCCEEW), as tabled in Dept of Finance, Emissions Reporting Framework 2024-25, table 6;
 * other states use the NGA 2025 national average (0.62). New Zealand: MfE Measuring Emissions guide, electricity used 2025.
 * Fiji: no published factor found (EFL: 44% of 2025 generation was thermal), so the saving is not modelled there.
 */
const GRID: Partial<Record<Site["state"], number>> = { NSW: 0.66, ACT: 0.66, VIC: 0.77, QLD: 0.74, NZ: 0.0787 };
const AU_NATIONAL = 0.62;

export const gridFactorTPerMWh = (site: Pick<Site, "state">): number | null =>
  site.state === "FJ" ? null : (GRID[site.state] ?? AU_NATIONAL);

export const GRID_SOURCE: Record<string, string> = {
  Australia: "National Greenhouse Accounts Factors",
  "New Zealand": "Ministry for the Environment",
  Fiji: "no published factor; 44% of Fiji's 2025 electricity was thermal (EFL)",
};

/** Biomethane (landfill gas upgraded to pipeline quality). */
export const GAS = {
  /** Natural gas combustion, t CO2-e per GJ: NGA Factors 2024, table 5 (51.53 kg). */
  combustionTPerGJ: 0.05153,
  /** US EPA LFG handbook ch. 4, table 4-10: gas compression and treatment, USD 6,200–8,300 per scfm (2020). Midpoint. */
  upgradingCapexAudPerM3hCH4: Math.round(7250 * SCFM_PER_M3H_CH4 * AUD_PER_USD_2026),
  /** Same table: pipeline under a mile (USD 600,000) plus interconnect (USD 400,000). */
  connectionCapexAud: Math.round(1_000_000 * AUD_PER_USD_2026),
  /** Same table: USD 1,200–1,400 per scfm a year, including pipeline injection fees. Midpoint, on plant capacity. */
  upgradingOpexAudPerM3hYr: Math.round(1300 * SCFM_PER_M3H_CH4 * AUD_PER_USD_2026),
  /** AEMO Quarterly Energy Dynamics Q2 2026: east coast wholesale gas averaged AUD 9.08/GJ. */
  priceAudPerGJ: 9.08,
};
