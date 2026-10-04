import type { SiteResult } from "./types";

/** What a site does best among the sites being compared. */
export type Strength = "cheapest" | "first" | "most" | "smallest" | "payback" | "covers";

export type SiteComparison = {
  siteId: string;
  /** 1-based place in the cost-per-tonne order; null when there is nothing left to fund. */
  rank: number | null;
  /** Cost per tonne within TIE_SHARE of the cheapest site, so the order between them is not meaningful. */
  tiedWithTop: boolean;
  /** Extra net cost per tonne compared with the cheapest site. */
  gapPerT: number;
  /** For a site clearly dearer than the cheapest: whether plant cost or running cost explains more of the gap. */
  driver: "capex" | "running" | null;
  strengths: Strength[];
};

export type Comparison = { rows: SiteComparison[]; topId: string | null; allTied: boolean };

/** Costs within 10% of the cheapest site count as a tie: the capex range alone is wider than that. */
export const TIE_SHARE = 0.1;

const hasProject = (r: SiteResult) => Number.isFinite(r.netCostAudPerTCO2e) && r.avgAbatementTCO2ePerYear > 0;

/**
 * Explains the ranking in plain terms: which site leads on each measure, which are
 * effectively tied on cost per tonne, and why a dearer site costs more.
 */
export function compareSites(results: SiteResult[], projectLifeYears: number): Comparison {
  const ranked = results.filter(hasProject).sort((a, b) => a.netCostAudPerTCO2e - b.netCostAudPerTCO2e);
  const rest = results.filter((r) => !hasProject(r));
  const top = ranked[0];
  if (!top) return { rows: rest.map((r) => emptyRow(r.siteId)), topId: null, allTied: false };

  const life = Math.max(1, projectLifeYears);
  const capexPerT = (r: SiteResult) => r.capexMidAud / (r.avgAbatementTCO2ePerYear * life);
  const runningPerT = (r: SiteResult) => (r.annualOpexAud - r.annualRevenueAud) / r.avgAbatementTCO2ePerYear;
  const tieBand = Math.abs(top.netCostAudPerTCO2e) * TIE_SHARE + 1;

  const best = (pick: (r: SiteResult) => number, dir: 1 | -1) => {
    if (ranked.length < 2) return null;
    return ranked.reduce((b, r) => (dir * pick(r) > dir * pick(b) ? r : b)).siteId;
  };
  const most = best((r) => r.avgAbatementTCO2ePerYear, 1);
  const smallest = best((r) => r.capexMidAud, -1);
  const withPayback = ranked.filter((r) => r.simplePaybackYears !== null);
  const payback =
    ranked.length > 1 && withPayback.length > 0
      ? withPayback.reduce((b, r) => (r.simplePaybackYears! < b.simplePaybackYears! ? r : b)).siteId
      : null;
  // "Cheapest" only means something when the runner-up is clearly dearer.
  const clearlyCheapest = ranked.length > 1 && ranked[1].netCostAudPerTCO2e - top.netCostAudPerTCO2e > tieBand;

  const rows: SiteComparison[] = ranked.map((r, i) => {
    const gap = r.netCostAudPerTCO2e - top.netCostAudPerTCO2e;
    const tied = i > 0 && gap <= tieBand;
    const strengths: Strength[] = [];
    if (i === 0 && ranked.length > 1) strengths.push(clearlyCheapest ? "cheapest" : "first");
    if (r.siteId === most) strengths.push("most");
    if (r.siteId === smallest) strengths.push("smallest");
    if (r.siteId === payback) strengths.push("payback");
    if (r.annualRevenueAud >= r.annualOpexAud) strengths.push("covers");
    const driver =
      i === 0 || tied ? null : capexPerT(r) - capexPerT(top) >= runningPerT(r) - runningPerT(top) ? "capex" : "running";
    return { siteId: r.siteId, rank: i + 1, tiedWithTop: tied, gapPerT: gap, driver, strengths };
  });

  const allTied = ranked.length > 1 && rows.slice(1).every((r) => r.tiedWithTop);
  return { rows: [...rows, ...rest.map((r) => emptyRow(r.siteId))], topId: top.siteId, allTied };
}

const emptyRow = (siteId: string): SiteComparison => ({
  siteId,
  rank: null,
  tiedWithTop: false,
  gapPerT: 0,
  driver: null,
  strengths: [],
});
