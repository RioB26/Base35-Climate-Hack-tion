import { useMemo, useState } from "react";
import { Info } from "../components/Info";
import { Mark } from "../components/Mark";
import { PageHead } from "../components/Nav";
import { useMoney } from "../components/currency";
import { regionOf, useData } from "../data";
import { GAS, gridFactorTPerMWh, GRID_SOURCE } from "../data/routeFactors";
import { fmtInt, fmtT, shortName } from "../format";
import { country, creditScheme } from "../model/country";
import { cop31Score, methaneCut } from "../model/cop31";
import { compareWithSatellite } from "../model/discrepancy";
import { gasRoutes, type RouteId, type RouteResult } from "../model/routes";
import type { Assumptions, Site, SiteResult } from "../model/types";
import type { Route } from "../route";

type Props = { site: Site; result: SiteResult; assumptions: Assumptions; go: (r: Route) => void };

const ROUTE_TEXT: Record<RouteId, { name: string; what: string; plant: string }> = {
  none: {
    name: "Leave it",
    what: "No project. The methane keeps escaping from the tip.",
    plant: "",
  },
  flare: {
    name: "Burn it off",
    what: "Collect the gas and burn it in an enclosed flare. Cheapest to build, but the energy is wasted.",
    plant: "an enclosed flare",
  },
  power: {
    name: "Make electricity",
    what: "Collect the gas and run it through engines that feed the grid. The power sales pay back part of the cost.",
    plant: "gas engines and a grid connection",
  },
  biomethane: {
    name: "Clean it into biomethane",
    what: "Upgrade the gas to pipeline quality for the gas network or vehicle fuel, replacing fossil gas.",
    plant: "an upgrading plant and a gas network or refuelling connection",
  },
};

const VERDICT_TEXT = {
  higher: "The satellite sees more methane downwind than the reported figures explain. Worth a closer look.",
  lower: "The satellite sees less methane than expected.",
  consistent: "The satellite signal fits what the site reports.",
  no_data: "The satellite check has not been run for this site yet.",
} as const;

/** A printable, step-by-step capture plan for one landfill, comparing what to do with the gas. */
export function PlanPage({ site, result: r, assumptions: a, go }: Props) {
  const { fmtAudM, fmtCostPerT } = useMoney();
  const { satelliteFor } = useData();
  const name = shortName(site.name);
  const routes = useMemo(() => gasRoutes(site, a), [site, a]);
  const options = routes.filter((x) => x.id !== "none");
  const hasProject = options.length > 0;
  const [picked, setPicked] = useState<RouteId>("power");
  const chosen = routes.find((x) => x.id === picked) ?? routes[0];
  const check = useMemo(() => compareWithSatellite(site, satelliteFor(site.id), a), [site, satelliteFor, a]);

  const cap = Math.round(site.existingCapture * 100);
  const target = Math.round(a.captureEfficiency * 100);
  const escapingT = r.generationTCH4PerYear * (1 - site.existingCapture);
  const total = (x: RouteResult) => x.methaneCutTCO2ePerYear + x.displacedTCO2ePerYear;
  const cheapest = hasProject ? options.reduce((b, x) => (x.netCostAudPerTCO2e < b.netCostAudPerTCO2e ? x : b)).id : null;
  const biggest = hasProject ? options.reduce((b, x) => (total(x) > total(b) ? x : b)).id : null;
  const maxTotal = Math.max(1, ...options.map(total));
  const score = (x: RouteResult) =>
    x.id === "none" ? null : cop31Score(site, { ...r, netCostAudPerTCO2e: x.netCostAudPerTCO2e, annualRevenueAud: x.annualRevenueAud, annualOpexAud: x.annualOpexAud }, a);
  const chosenScore = score(chosen);
  const scheme = creditScheme(site);
  const funding =
    scheme === "ACCUs"
      ? "Australian carbon credits (ACCUs) under the landfill gas method, plus state waste levy or council funding"
      : scheme === "NZ ETS"
        ? "council and regional funding; landfill emissions are already priced under the NZ Emissions Trading Scheme"
        : "international climate finance and development banks, as there is no local carbon credit scheme";
  const today = new Date().toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" });

  const exportPdf = () => {
    const prev = document.title;
    document.title = `Sentinel Sniff plan - ${name}`;
    window.print();
    document.title = prev;
  };

  return (
    <main className="page plan">
      <div className="print-only print-head">
        <Mark size={36} />
        <span className="wordmark">
          Sentinel <em>Sniff</em>
        </span>
        <span className="print-date">{today}</span>
      </div>
      <PageHead
        step="Step 5 · Plan"
        title={`Methane capture plan for ${name}`}
        sub={`${regionOf(site)}. A step-by-step guide to fixing this landfill's methane, and what each way of using the gas achieves.`}
      >
        <div className="actions no-print">
          <button type="button" className="cta" onClick={exportPdf}>
            Export PDF
          </button>
          <button type="button" className="ghost" onClick={() => go({ page: "fund", siteId: site.id })}>
            ← Back to Fund
          </button>
        </div>
      </PageHead>

      <section className="plan-section">
        <h2 className="section-title">The site today</h2>
        <div className="stats plan-stats">
          <div className="stat">
            <span className="stat-label">Methane made</span>
            <span className="stat-value">{fmtInt(r.generationTCH4PerYear)} t</span>
            <span className="stat-sub">a year in {a.commissioningYear}, modelled</span>
          </div>
          <div className="stat">
            <span className="stat-label">Captured today</span>
            <span className="stat-value">{cap}%</span>
            <span className="stat-sub">{site.existingCapture === 0 ? "no capture or flaring reported" : "reported by the site or a proxy"}</span>
          </div>
          <div className="stat accent">
            <span className="stat-label">Escaping</span>
            <span className="stat-value">{fmtInt(escapingT)} t</span>
            <span className="stat-sub">about {fmtT(escapingT * a.gwp100)} tCO₂-e a year</span>
          </div>
          <div className="stat sky">
            <span className="stat-label">Satellite check</span>
            <span className="stat-text">{VERDICT_TEXT[check.verdict]}</span>
          </div>
        </div>
      </section>

      {!hasProject ? (
        <section className="plan-section">
          <p className="insight">
            {name} already captures about {cap}% of its methane, above the {target}% target, so there is no new project to plan. Raise
            the target on the Fix step to compare options.
          </p>
        </section>
      ) : (
        <>
          <section className="plan-section">
            <h2 className="section-title">
              Choose what to do with the gas
              <Info label="How the options compare">
                Every option captures the same gas at a {target}% target, so the methane cut is the same. They differ in what the gas
                replaces: electricity replaces grid power ({gridFactorTPerMWh(site)} tCO₂-e per MWh in {country(site)}, {GRID_SOURCE[country(site)]}),
                and biomethane replaces fossil gas ({GAS.combustionTPerGJ * 1000} kg CO₂-e per GJ). Cost per tonne counts methane only,
                as in the Fund step.
              </Info>
            </h2>
            <p className="page-sub">Pick one to see its steps, goals and impact below. The PDF includes your choice.</p>
            <div className="route-grid" role="radiogroup" aria-label="What to do with the gas">
              {routes.map((x) => {
                const t = ROUTE_TEXT[x.id];
                const on = x.id === chosen.id;
                return (
                  <button
                    type="button"
                    role="radio"
                    aria-checked={on}
                    key={x.id}
                    className={`route-card ${x.id} ${on ? "on" : ""}`}
                    onClick={() => setPicked(x.id)}
                  >
                    <span className="route-name">{t.name}</span>
                    <span className="chips">
                      {x.id === cheapest && <span className="chip">Lowest cost per tonne</span>}
                      {x.id === biggest && <span className="chip good">Biggest climate benefit</span>}
                      {x.id === "none" && <span className="chip bad">Methane keeps escaping</span>}
                    </span>
                    <span className="route-what">{t.what}</span>
                    <span className="route-bar" aria-hidden="true">
                      <span className="cut" style={{ width: `${(x.methaneCutTCO2ePerYear / maxTotal) * 100}%` }} />
                      <span className="disp" style={{ width: `${(x.displacedTCO2ePerYear / maxTotal) * 100}%` }} />
                    </span>
                    <dl className="route-figs">
                      <div>
                        <dt>Climate benefit</dt>
                        <dd>{x.id === "none" ? "None" : `${fmtT(total(x))} tCO₂-e/yr`}</dd>
                      </div>
                      <div>
                        <dt>Energy</dt>
                        <dd>{energyText(x)}</dd>
                      </div>
                      <div>
                        <dt>Budget</dt>
                        <dd>{x.id === "none" ? "None" : fmtAudM(x.capexMidAud)}</dd>
                      </div>
                      <div>
                        <dt>Cost per tonne</dt>
                        <dd>{x.id === "none" ? "n/a" : fmtCostPerT(x.netCostAudPerTCO2e)}</dd>
                      </div>
                    </dl>
                  </button>
                );
              })}
            </div>
            <p className="route-key small muted">
              <span className="key cut" /> methane cut <span className="key disp" /> fossil energy replaced
            </p>
          </section>

          {chosen.id === "none" ? (
            <section className="plan-section">
              <h2 className="section-title">What leaving it means</h2>
              <p className="insight">
                {name} would keep releasing about {fmtInt(escapingT)} t of methane a year, about {fmtT(escapingT * a.gwp100)} tCO₂-e,
                or {fmtT(escapingT * a.gwp20)} tCO₂-e on the 20-year view that matters most for warming before 2050. Every option
                above cuts at least {fmtT(options[0].methaneCutTCO2ePerYear)} tCO₂-e of that a year.
              </p>
            </section>
          ) : (
            <>
              <section className="plan-section">
                <h2 className="section-title">Step by step: {ROUTE_TEXT[chosen.id].name.toLowerCase()}</h2>
                <ol className="plan-steps">
                  <li>
                    <strong>Measure what is escaping.</strong> Walk the surface with a methane detector and request a drone or
                    high-resolution satellite pass to find the leaking areas. {VERDICT_TEXT[check.verdict]}
                  </li>
                  <li>
                    <strong>Confirm how much gas there is.</strong> Drill test wells and run a pump trial to check our modelled{" "}
                    {fmtInt(r.generationTCH4PerYear)} t of methane a year before sizing any plant.
                  </li>
                  <li>
                    <strong>Cap and collect.</strong> Cover finished cells and add gas wells and pipework to lift capture from {cap}% to{" "}
                    {target}%, about {fmtInt(r.capturedTCH4PerYear)} t of extra methane a year.
                  </li>
                  <li>
                    <strong>Build {ROUTE_TEXT[chosen.id].plant}.</strong>{" "}
                    {chosen.id === "power"
                      ? `About ${(r.electricKW / 1000).toFixed(1)} MW of engines, making ${fmtT((chosen.energy?.perYear ?? 0) / 1000)} GWh a year.`
                      : chosen.id === "biomethane"
                        ? `It would supply about ${fmtT((chosen.energy?.perYear ?? 0) / 1000)} TJ of gas a year.`
                        : "A flare destroys the methane but produces nothing to sell."}
                  </li>
                  <li>
                    <strong>Fund it.</strong> Budget about {fmtAudM(chosen.capexMidAud)} to be running by {a.commissioningYear}. Look at{" "}
                    {funding}.
                  </li>
                  <li>
                    <strong>Monitor and report.</strong> Tune the wells, check surface emissions every quarter, and re-run the
                    satellite check each year to show the methane has fallen.
                  </li>
                </ol>
              </section>

              <section className="plan-section">
                <h2 className="section-title">Goals you can reach</h2>
                <div className="goal-grid">
                  <div className="goal">
                    <span className="goal-num">{Math.round(methaneCut(site, a) * 100)}%</span>
                    <span>
                      of the methane now escaping, cut. The Global Methane Pledge asks for 30% by 2030;{" "}
                      {methaneCut(site, a) >= 0.3 ? "this meets it." : "this falls short of it."}
                    </span>
                  </div>
                  <div className="goal">
                    <span className="goal-num">{fmtT(chosen.methaneCutToHorizonTCO2e)}</span>
                    <span>tCO₂-e of methane avoided by {a.horizonYear}.</span>
                  </div>
                  {chosenScore && (
                    <div className="goal">
                      <span className="goal-num">{Math.round(chosenScore.total)}/100</span>
                      <span>on our COP31 alignment check (our own rubric, not an official score).</span>
                    </div>
                  )}
                  {chosen.id === "power" && chosen.homes >= 1 && (
                    <div className="goal sky">
                      <span className="goal-num">{fmtInt(Math.round(chosen.homes / 100) * 100)}</span>
                      <span>homes' worth of electricity a year.</span>
                    </div>
                  )}
                  {chosen.id === "biomethane" && (
                    <div className="goal sky">
                      <span className="goal-num">{fmtT((chosen.energy?.perYear ?? 0) / 1000)} TJ</span>
                      <span>of fossil gas replaced each year.</span>
                    </div>
                  )}
                </div>
              </section>

              <section className="plan-section">
                <h2 className="section-title">Environmental impact</h2>
                <div className="impact">
                  <table className="impact-table">
                    <tbody>
                      <tr>
                        <th>Methane destroyed</th>
                        <td>{fmtT(chosen.methaneCutTCO2ePerYear)} tCO₂-e a year</td>
                      </tr>
                      <tr>
                        <th>Fossil energy replaced</th>
                        <td>{chosen.displacedTCO2ePerYear > 0 ? `${fmtT(chosen.displacedTCO2ePerYear)} tCO₂-e a year` : "None"}</td>
                      </tr>
                      <tr className="total">
                        <th>Total climate benefit</th>
                        <td>{fmtT(total(chosen))} tCO₂-e a year</td>
                      </tr>
                      <tr>
                        <th>20-year view of the methane</th>
                        <td>{fmtT((chosen.methaneCutTCO2ePerYear * a.gwp20) / a.gwp100)} tCO₂-e a year</td>
                      </tr>
                    </tbody>
                  </table>
                  <ul className="impact-list">
                    <li>Less odour around the site, because the gas is drawn into wells instead of seeping out.</li>
                    <li>Lower risk of landfill fires and gas moving underground into nearby buildings.</li>
                    <li>Burning the gas also destroys most of the trace pollutants it carries.</li>
                    {chosen.id === "flare" && <li>The heat is wasted: choosing electricity or biomethane would add a fossil energy saving.</li>}
                  </ul>
                </div>
              </section>
            </>
          )}
        </>
      )}

      <footer className="limits">
        <p>
          <strong>Pre-feasibility screening, not a business case.</strong> Methane uses GWP100 = 28 (GWP20 = 80.8 for the 20-year
          view). Costs are benchmarked against US EPA landfill gas project costs converted to AUD; the biomethane plant cost and
          gas price are screening values. Methods, sources and disclosures are in docs/ in the project repository. Made with
          Sentinel Sniff.
        </p>
      </footer>
    </main>
  );

  function energyText(x: RouteResult) {
    if (!x.energy) return "None";
    return x.energy.kind === "electricity"
      ? `${fmtT(x.energy.perYear / 1000)} GWh/yr${x.homes >= 1 ? ` · ${fmtInt(Math.round(x.homes / 100) * 100)} homes` : ""}`
      : `${fmtT(x.energy.perYear / 1000)} TJ gas/yr`;
  }
}
