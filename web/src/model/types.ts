// Shared contract between data files, the model and the UI.

export type Range = [low: number, high: number];

/** A period during which the site accepted waste at a constant rate. */
export type AcceptancePeriod = { fromYear: number; toYear: number; tonnesPerYear: number };

export type Site = {
  id: string;
  name: string;
  state: "NSW" | "VIC" | "QLD" | "WA" | "SA" | "TAS" | "ACT" | "NT" | "NZ";
  lat: number;
  lon: number;
  /** Waste accepted per year. Future years count as accepted if within a period. */
  acceptance: AcceptancePeriod[];
  /** First-order decay rate (1/yr). */
  k: number;
  /** Methane generation potential (m3 CH4 per tonne of waste). */
  L0: number;
  /** Fraction of generated methane already captured before the project (0 to 1). */
  existingCapture: number;
  /** True when inputs are placeholders or proxies rather than sourced site data. */
  illustrative: boolean;
  notes: string;
  sources: string[];
};

/** Global inputs. Values marked as sliders in the UI can be changed live. */
export type Assumptions = {
  captureEfficiency: number; // fraction of generation captured with the project
  engineEfficiency: number; // electrical efficiency of the gas engine
  availability: number; // fraction of hours the engine runs
  powerPriceAudPerMWh: number;
  capexMultiplier: number; // scales both ends of the capex range
  discountRate: number;
  projectLifeYears: number;
  commissioningYear: number;
  horizonYear: number; // cumulative abatement is reported to this year (2035)
  gwp100: number; // 28, Australia's national accounting factor
  gwp20: number; // 80.8, IPCC AR6 biogenic methane, secondary view only
  methaneDensityKgPerM3: number;
  methaneLhvKWhPerM3: number;
  // Cost ranges, benchmarked against US EPA landfill gas project costs (see assumptions.ts).
  collectionCapexAudPerM3h: Range; // gas collection and flare, per m3/h of methane captured
  engineCapexAudPerKW: Range; // generation plant, per kW electric
  engineOpexAudPerMWh: number;
  collectionOpexFractionOfCapex: number; // per year, of collection capex
  includeAccu: boolean;
  accuPriceAud: number; // only shown with an eligibility footnote
};

export type SatelliteStatus = "elevated" | "neutral" | "inconclusive" | "not_run";

export type SatelliteResult = {
  status: SatelliteStatus;
  overpassesUsed: number;
  windowStart: string | null;
  windowEnd: string | null;
  deltaPpb: number | null;
  ci95Ppb: Range | null;
  confidence: "low" | "medium" | "high" | null;
  note: string;
};

export type YearRow = {
  year: number;
  generationTCH4: number;
  abatedTCO2e: number;
  electricityMWh: number;
};

export type SiteResult = {
  siteId: string;
  /** Methane generated in the commissioning year. */
  generationTCH4PerYear: number;
  /** Methane captured by the project in the commissioning year (incremental to existing capture). */
  capturedTCH4PerYear: number;
  /** Average annual abatement over the project life (GWP100). */
  avgAbatementTCO2ePerYear: number;
  /** Cumulative abatement from commissioning to the horizon year (GWP100). */
  abatementToHorizonTCO2e: number;
  abatementToHorizonTCO2eGwp20: number;
  electricKW: number;
  electricityMWhPerYear: number;
  capexAud: Range;
  capexMidAud: number;
  annualOpexAud: number;
  annualRevenueAud: number;
  annualAccuRevenueAud: number;
  /** Levelised net cost per tCO2-e abated over the project life, excluding ACCU revenue. */
  netCostAudPerTCO2e: number;
  netCostAudPerTCO2eRange: Range;
  simplePaybackYears: number | null;
  years: YearRow[];
};
