import { annualPhysics } from "./project";
import { methaneGeneratedM3 } from "./generation";
import { homesPowered } from "./homes";
import { GAS, gridFactorTPerMWh } from "../data/routeFactors";
import type { Assumptions, Site } from "./types";

/** What the site does with the gas it collects. */
export type RouteId = "none" | "flare" | "power" | "biomethane";

export type RouteResult = {
  id: RouteId;
  /** Average methane abated a year over the project life (tCO2-e, GWP100). */
  methaneCutTCO2ePerYear: number;
  /** Methane abated from commissioning to the horizon year (tCO2-e, GWP100). */
  methaneCutToHorizonTCO2e: number;
  /** Average fossil emissions avoided a year by the energy it replaces (tCO2-e). */
  displacedTCO2ePerYear: number;
  /** First-year energy sold: electricity in MWh or biomethane in GJ. */
  energy: { kind: "electricity" | "gas"; perYear: number } | null;
  capexMidAud: number;
  annualOpexAud: number;
  annualRevenueAud: number;
  /** Levelised net cost per tCO2-e of methane abated, as in the main model (credits excluded). */
  netCostAudPerTCO2e: number;
  simplePaybackYears: number | null;
  homes: number;
};

const GJ_PER_KWH = 0.0036;

/**
 * Compares flaring, electricity and biomethane for one site with the same capture target,
 * plant sizing and discounting as computeSite, so the "power" route matches the main model.
 */
export function gasRoutes(site: Site, a: Assumptions): RouteResult[] {
  const life = Math.max(1, Math.round(a.projectLifeYears));
  const physics = Array.from({ length: life }, (_, i) => {
    const year = a.commissioningYear + i;
    return { year, ...annualPhysics(methaneGeneratedM3(site, year), site.existingCapture, a) };
  });
  const peakM3h = Math.max(...physics.map((p) => p.capturedM3PerHour));
  const peakKW = Math.max(...physics.map((p) => p.electricKW));
  const mid = (r: [number, number]) => (r[0] + r[1]) / 2;
  const collectionCapex = mid(a.collectionCapexAudPerM3h) * peakM3h * a.capexMultiplier;
  const collectionOpex = collectionCapex * a.collectionOpexFractionOfCapex;
  const grid = gridFactorTPerMWh(site);
  // Upgrading losses are not modelled: all captured methane is sold as biomethane.
  const gasGJ = (capturedM3: number) => capturedM3 * a.methaneLhvKWhPerM3 * GJ_PER_KWH;

  type Spec = {
    capex: number;
    opex: (p: (typeof physics)[number]) => number;
    revenue: (p: (typeof physics)[number]) => number;
    displaced: (p: (typeof physics)[number]) => number;
    energy: (p: (typeof physics)[number]) => RouteResult["energy"];
  };
  const specs: Record<Exclude<RouteId, "none">, Spec> = {
    flare: { capex: collectionCapex, opex: () => collectionOpex, revenue: () => 0, displaced: () => 0, energy: () => null },
    power: {
      capex: collectionCapex + mid(a.engineCapexAudPerKW) * peakKW * a.capexMultiplier,
      opex: (p) => collectionOpex + p.electricityMWh * a.engineOpexAudPerMWh,
      revenue: (p) => p.electricityMWh * a.powerPriceAudPerMWh,
      displaced: (p) => p.electricityMWh * (grid ?? 0),
      energy: (p) => ({ kind: "electricity", perYear: p.electricityMWh }),
    },
    biomethane: {
      capex: collectionCapex + (GAS.upgradingCapexAudPerM3hCH4 * peakM3h + GAS.connectionCapexAud) * a.capexMultiplier,
      opex: () => collectionOpex + GAS.upgradingOpexAudPerM3hYr * peakM3h,
      revenue: (p) => gasGJ(p.capturedM3) * GAS.priceAudPerGJ,
      displaced: (p) => gasGJ(p.capturedM3) * GAS.combustionTPerGJ,
      energy: (p) => ({ kind: "gas", perYear: gasGJ(p.capturedM3) }),
    },
  };

  const none: RouteResult = {
    id: "none",
    methaneCutTCO2ePerYear: 0,
    methaneCutToHorizonTCO2e: 0,
    displacedTCO2ePerYear: 0,
    energy: null,
    capexMidAud: 0,
    annualOpexAud: 0,
    annualRevenueAud: 0,
    netCostAudPerTCO2e: 0,
    simplePaybackYears: null,
    homes: 0,
  };
  if (physics[0].capturedM3 <= 0) return [none];

  const routes = (Object.keys(specs) as Exclude<RouteId, "none">[]).map((id): RouteResult => {
    const s = specs[id];
    let pvNet = 0;
    let pvAbated = 0;
    physics.forEach((p, i) => {
      const d = Math.pow(1 + a.discountRate, i + 1);
      pvNet += (s.opex(p) - s.revenue(p)) / d;
      pvAbated += p.abatedTCO2e / d;
    });
    const first = physics[0];
    const net = s.revenue(first) - s.opex(first);
    const energy = s.energy(first);
    return {
      id,
      methaneCutTCO2ePerYear: physics.reduce((t, p) => t + p.abatedTCO2e, 0) / life,
      methaneCutToHorizonTCO2e: physics.filter((p) => p.year <= a.horizonYear).reduce((t, p) => t + p.abatedTCO2e, 0),
      displacedTCO2ePerYear: physics.reduce((t, p) => t + s.displaced(p), 0) / life,
      energy,
      capexMidAud: s.capex,
      annualOpexAud: s.opex(first),
      annualRevenueAud: s.revenue(first),
      netCostAudPerTCO2e: pvAbated > 0 ? (s.capex + pvNet) / pvAbated : Infinity,
      simplePaybackYears: net > 0 ? s.capex / net : null,
      homes: energy?.kind === "electricity" ? homesPowered(energy.perYear, site) : 0,
    };
  });
  return [none, ...routes];
}
