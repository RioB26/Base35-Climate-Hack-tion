import type { SiteResult } from "./types";

export type MaccBar = {
  siteId: string;
  costPerT: number;
  widthT: number; // average tCO2-e/yr over project life
  x0: number; // cumulative abatement at the bar's left edge
  capexMidAud: number;
  funded: boolean;
};

export type Portfolio = {
  bars: MaccBar[];
  fundedCount: number;
  fundedCapexAud: number;
  fundedAbatementToHorizon: number;
};

/**
 * Sort sites by levelised cost per tonne and fund them in that order until the
 * next site's capex no longer fits the budget. Strict order keeps it explainable.
 */
export function buildPortfolio(results: SiteResult[], budgetAud: number): Portfolio {
  const sorted = results
    .filter((r) => Number.isFinite(r.netCostAudPerTCO2e) && r.avgAbatementTCO2ePerYear > 0)
    .sort((a, b) => a.netCostAudPerTCO2e - b.netCostAudPerTCO2e);

  let x = 0;
  let spent = 0;
  let abated = 0;
  let stillFunding = true;
  const bars = sorted.map((r) => {
    const fits = stillFunding && spent + r.capexMidAud <= budgetAud;
    if (fits) {
      spent += r.capexMidAud;
      abated += r.abatementToHorizonTCO2e;
    } else {
      stillFunding = false;
    }
    const bar: MaccBar = {
      siteId: r.siteId,
      costPerT: r.netCostAudPerTCO2e,
      widthT: r.avgAbatementTCO2ePerYear,
      x0: x,
      capexMidAud: r.capexMidAud,
      funded: fits,
    };
    x += r.avgAbatementTCO2ePerYear;
    return bar;
  });

  return {
    bars,
    fundedCount: bars.filter((b) => b.funded).length,
    fundedCapexAud: spent,
    fundedAbatementToHorizon: abated,
  };
}
