import type { Assumptions, Site, SiteResult } from "./types";

// Our own transparent rubric, not an official COP31 metric. Four parts, 25 points each,
// each anchored to a public target or price so the score can be checked by hand.

export type ScorePart = { key: string; label: string; value: string; rule: string; points: number; max: number };
export type Cop31Score = { total: number; max: number; parts: ScorePart[] };

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const pct = (x: number) => `${Math.round(x * 100)}%`;

/** Share of the site's currently escaping methane that the project would stop. */
export function methaneCut(site: Site, a: Assumptions): number {
  const escaping = 1 - site.existingCapture;
  return escaping > 0 ? Math.max(0, a.captureEfficiency - site.existingCapture) / escaping : 0;
}

export function cop31Score(site: Site, r: SiteResult, a: Assumptions): Cop31Score | null {
  if (!Number.isFinite(r.netCostAudPerTCO2e) || r.capturedTCH4PerYear <= 0) return null;

  // 1. Global Methane Pledge: cut methane 30% by 2030. 45% is the cut UNEP's Global
  //    Methane Assessment links to 1.5 °C. 15 points at 30%, full points at 45%.
  const cut = methaneCut(site, a);
  const cutPts = cut <= 0.3 ? (cut / 0.3) * 15 : 15 + clamp01((cut - 0.3) / 0.15) * 10;

  // 2. Speed: full points if running by the Pledge's 2030 deadline, none by 2035.
  const speedPts = 25 * clamp01((2035 - a.commissioningYear) / 5);

  // 3. Cost per tonne against the carbon price: full points at or below zero cost,
  //    half at the ACCU price, none at twice the ACCU price.
  const cost = r.netCostAudPerTCO2e;
  const costPts = 25 * clamp01(1 - cost / (2 * a.accuPriceAud || 1));

  // 4. Electricity: does selling the power cover the running costs?
  const cover = r.annualOpexAud > 0 ? r.annualRevenueAud / r.annualOpexAud : 0;
  const energyPts = 25 * clamp01(cover);

  const parts: ScorePart[] = [
    {
      key: "cut",
      label: "Methane cut",
      value: `${pct(cut)} of the methane now escaping`,
      rule: "Global Methane Pledge: 30% by 2030 earns 15 points; 45% (UNEP's 1.5 °C pathway) earns 25.",
      points: cutPts,
      max: 25,
    },
    {
      key: "speed",
      label: "Speed",
      value: `running from ${a.commissioningYear}`,
      rule: "Full points if running by 2030, the Pledge deadline, falling to zero by 2035.",
      points: speedPts,
      max: 25,
    },
    {
      key: "cost",
      label: "Cost per tonne",
      value: `AUD ${Math.round(cost)} vs ACCU AUD ${a.accuPriceAud}`,
      rule: "Full points at zero net cost, half at the carbon credit price, none at twice that price.",
      points: costPts,
      max: 25,
    },
    {
      key: "energy",
      label: "Electricity produced",
      value: `power sales cover ${pct(cover)} of running costs`,
      rule: "Full points when selling the electricity pays for running the plant.",
      points: energyPts,
      max: 25,
    },
  ];
  return { total: parts.reduce((s, p) => s + p.points, 0), max: 100, parts };
}
