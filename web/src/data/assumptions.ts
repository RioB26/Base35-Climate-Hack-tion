import type { Assumptions } from "../model/types";

// Conversion of US EPA 2020-dollar benchmarks to 2026 AUD. Both factors are
// team assumptions (not sourced rates); change them here and in DISCLOSURES.md.
const AUD_PER_USD = 1.5;
const ESCALATION_2020_TO_2026 = 1.25;
// Upper end of each capex range: Australian projects assumed up to 40% dearer than US typical.
const AU_PREMIUM_HIGH = 1.4;
const toAud2026 = (usd2020: number) => usd2020 * AUD_PER_USD * ESCALATION_2020_TO_2026;

// US EPA LMOP, LFG Energy Project Development Handbook, ch. 4 (2021), 2020 dollars:
// gas collection and flare for a 600 scfm system ~ USD 1,313,000 capital, ~USD 221,000/yr O&M.
// 600 scfm landfill gas ~ 1,019 m3/h at 50% CH4 ~ 510 m3/h of methane.
const COLLECTION_USD_PER_M3H_CH4 = 1_313_000 / 510;
// Same source, table 4-3: large internal combustion engine (>= 800 kW) USD 2,000/kW capital, USD 300/kW-yr O&M.
const ENGINE_USD_PER_KW = 2000;
const ENGINE_OM_USD_PER_KW_YR = 300;

// Defaults for every global input. Every value has a source or is marked as an assumption.
export const defaultAssumptions: Assumptions = {
  captureEfficiency: 0.75, // project capture rate; slider
  engineEfficiency: 0.38, // typical gas-engine electrical efficiency; slider
  availability: 0.9,
  // AEMO Quarterly Energy Dynamics Q2 2026: NEM average wholesale price AUD 74/MWh (NSW 75). Slider.
  powerPriceAudPerMWh: 75,
  capexMultiplier: 1, // slider
  discountRate: 0.07, // assumption; slider
  projectLifeYears: 15, // assumption
  commissioningYear: 2028, // assumption
  horizonYear: 2035,
  gwp100: 28, // Australia's national accounting factor for methane
  gwp20: 80.8, // IPCC AR6, biogenic methane; secondary view only
  methaneDensityKgPerM3: 0.717,
  methaneLhvKWhPerM3: 9.97,
  collectionCapexAudPerM3h: [
    Math.round(toAud2026(COLLECTION_USD_PER_M3H_CH4)),
    Math.round(toAud2026(COLLECTION_USD_PER_M3H_CH4) * AU_PREMIUM_HIGH),
  ],
  engineCapexAudPerKW: [toAud2026(ENGINE_USD_PER_KW), toAud2026(ENGINE_USD_PER_KW) * AU_PREMIUM_HIGH],
  // USD 300/kW-yr over 8,760 h x 90% availability ~ USD 38/MWh.
  engineOpexAudPerMWh: Math.round(toAud2026((ENGINE_OM_USD_PER_KW_YR / (8760 * 0.9)) * 1000)),
  collectionOpexFractionOfCapex: 221_000 / 1_313_000, // ~17% of collection capex per year
  includeAccu: false,
  // Clean Energy Regulator, Quarterly Carbon Market Report March quarter 2026: generic ACCU spot AUD 36.28.
  accuPriceAud: 36,
  // CER, simple method guide for the landfill gas method 2025: default baseline proportion
  // starts at 0.30 to 0.40 depending on project type and rises 0.5% a year. Midpoint used.
  accuBaselineProportion: 0.35,
};
