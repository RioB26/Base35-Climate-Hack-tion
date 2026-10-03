import { methaneGeneratedM3 } from "./generation";
import type { Assumptions, Range, Site, SiteResult, YearRow } from "./types";

const HOURS_PER_YEAR = 8760;

/** Physical results for one year from a methane generation rate. */
export function annualPhysics(methaneM3PerYear: number, existingCapture: number, a: Assumptions) {
  const generationT = (methaneM3PerYear * a.methaneDensityKgPerM3) / 1000;
  // The project only counts methane it captures on top of what is already captured,
  // so sites with existing capture are not double counted.
  const incrementalFraction = Math.max(0, a.captureEfficiency - existingCapture);
  const capturedM3 = methaneM3PerYear * incrementalFraction;
  const capturedT = generationT * incrementalFraction;
  const thermalKW = (capturedM3 / HOURS_PER_YEAR) * a.methaneLhvKWhPerM3;
  const electricKW = thermalKW * a.engineEfficiency;
  const electricityMWh = (electricKW * HOURS_PER_YEAR * a.availability) / 1000;
  return {
    generationT,
    capturedM3,
    capturedT,
    capturedM3PerHour: capturedM3 / HOURS_PER_YEAR,
    abatedTCO2e: capturedT * a.gwp100,
    abatedTCO2eGwp20: capturedT * a.gwp20,
    thermalKW,
    electricKW,
    electricityMWh,
  };
}

export function computeSite(site: Site, a: Assumptions): SiteResult {
  const life = Math.max(1, Math.round(a.projectLifeYears));
  const physics = Array.from({ length: life }, (_, i) => {
    const year = a.commissioningYear + i;
    return { year, ...annualPhysics(methaneGeneratedM3(site, year), site.existingCapture, a) };
  });

  // Plant is sized for the largest year over the project life.
  const peakM3h = Math.max(...physics.map((p) => p.capturedM3PerHour));
  const peakKW = Math.max(...physics.map((p) => p.electricKW));
  const capexAt = (idx: 0 | 1) =>
    (a.collectionCapexAudPerM3h[idx] * peakM3h + a.engineCapexAudPerKW[idx] * peakKW) * a.capexMultiplier;
  const capex: Range = [capexAt(0), capexAt(1)];
  const capexMid = (capex[0] + capex[1]) / 2;
  const collectionCapexMid =
    ((a.collectionCapexAudPerM3h[0] + a.collectionCapexAudPerM3h[1]) / 2) * peakM3h * a.capexMultiplier;

  const opex = (mwh: number) => mwh * a.engineOpexAudPerMWh + collectionCapexMid * a.collectionOpexFractionOfCapex;
  const revenue = (mwh: number) => mwh * a.powerPriceAudPerMWh;

  // Levelised net cost per tonne: PV(capex + opex - revenue) / PV(abatement).
  // ACCU revenue is excluded so the result can be compared against a carbon price.
  let pvNet = 0;
  let pvAbated = 0;
  physics.forEach((p, i) => {
    const d = Math.pow(1 + a.discountRate, i + 1);
    pvNet += (opex(p.electricityMWh) - revenue(p.electricityMWh)) / d;
    pvAbated += p.abatedTCO2e / d;
  });
  const levelised = (c: number) => (pvAbated > 0 ? (c + pvNet) / pvAbated : Infinity);

  const first = physics[0];
  const firstOpex = opex(first.electricityMWh);
  const firstRevenue = revenue(first.electricityMWh);
  const accu = a.includeAccu ? first.abatedTCO2e * a.accuPriceAud : 0;
  const netAnnual = firstRevenue + accu - firstOpex;

  const inHorizon = physics.filter((p) => p.year <= a.horizonYear);
  const years: YearRow[] = physics.map((p) => ({
    year: p.year,
    generationTCH4: p.generationT,
    abatedTCO2e: p.abatedTCO2e,
    electricityMWh: p.electricityMWh,
  }));

  return {
    siteId: site.id,
    generationTCH4PerYear: first.generationT,
    capturedTCH4PerYear: first.capturedT,
    avgAbatementTCO2ePerYear: physics.reduce((s, p) => s + p.abatedTCO2e, 0) / life,
    abatementToHorizonTCO2e: inHorizon.reduce((s, p) => s + p.abatedTCO2e, 0),
    abatementToHorizonTCO2eGwp20: inHorizon.reduce((s, p) => s + p.abatedTCO2eGwp20, 0),
    electricKW: first.electricKW,
    electricityMWhPerYear: first.electricityMWh,
    capexAud: capex,
    capexMidAud: capexMid,
    annualOpexAud: firstOpex,
    annualRevenueAud: firstRevenue,
    annualAccuRevenueAud: accu,
    netCostAudPerTCO2e: levelised(capexMid),
    netCostAudPerTCO2eRange: [levelised(capex[0]), levelised(capex[1])],
    simplePaybackYears: netAnnual > 0 ? capexMid / netAnnual : null,
    years,
  };
}
