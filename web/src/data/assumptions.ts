import type { Assumptions } from "../model/types";

// Defaults for every global input. Values marked PLACEHOLDER must be replaced
// with sourced figures and logged in docs/DISCLOSURES.md before the demo.
export const defaultAssumptions: Assumptions = {
  captureEfficiency: 0.75, // project capture rate; slider
  engineEfficiency: 0.38, // typical gas-engine electrical efficiency; slider
  availability: 0.9,
  powerPriceAudPerMWh: 80, // PLACEHOLDER: check current NEM wholesale/PPA prices; slider
  capexMultiplier: 1, // slider
  discountRate: 0.07, // slider
  projectLifeYears: 15,
  commissioningYear: 2028,
  horizonYear: 2035,
  gwp100: 28, // Australia's national accounting factor for methane
  gwp20: 80.8, // IPCC AR6, biogenic methane; secondary view only
  methaneDensityKgPerM3: 0.717,
  methaneLhvKWhPerM3: 9.97,
  collectionCapexAudPerM3h: [6000, 10000], // PLACEHOLDER: benchmark vs LFGcost-Web + AU projects
  engineCapexAudPerKW: [2000, 3000], // PLACEHOLDER: benchmark vs LFGcost-Web + AU projects
  engineOpexAudPerMWh: 25, // PLACEHOLDER
  collectionOpexFractionOfCapex: 0.05, // PLACEHOLDER
  includeAccu: false,
  accuPriceAud: 35, // PLACEHOLDER: check current ACCU spot price and method eligibility
};
