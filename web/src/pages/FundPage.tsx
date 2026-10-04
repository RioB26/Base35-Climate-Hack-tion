import { Cop31Card } from "../components/Cop31Card";
import { GenerationChart } from "../components/GenerationChart";
import { Headline } from "../components/Headline";
import { Info } from "../components/Info";
import { HomesPowered } from "../components/HomesPowered";
import { Macc } from "../components/Macc";
import { PageHead } from "../components/Nav";
import { SiteCompare } from "../components/SiteCompare";
import { Stat } from "../components/Stat";
import { fmtInt, fmtT, shortName } from "../format";
import { useMoney } from "../components/currency";
import { cop31Score } from "../model/cop31";
import { creditScheme, inAustralia } from "../model/country";
import type { Portfolio } from "../model/macc";
import { potentialAccuAud } from "../model/project";
import type { Assumptions, Site, SiteResult } from "../model/types";
import type { Route } from "../route";

type Props = {
  site: Site;
  sites: Site[];
  result: SiteResult;
  results: SiteResult[];
  assumptions: Assumptions;
  portfolio: Portfolio;
  budget: number;
  maxBudget: number;
  budgetShare: number;
  setBudgetShare: (v: number) => void;
  go: (r: Route) => void;
};

export function FundPage(p: Props) {
  const { fmtMoney, fmtAudM, fmtCostPerT } = useMoney();
  const { site, result: r, assumptions: a } = p;
  const name = shortName(site.name);
  const noProject = !Number.isFinite(r.netCostAudPerTCO2e);
  const rawScore = cop31Score(site, r, a);
  const score = rawScore ? {
    ...rawScore,
    parts: rawScore.parts.map((part) => part.key === "cost" ? {
      ...part,
      value: `${fmtMoney(r.netCostAudPerTCO2e)} vs ACCU ${fmtMoney(a.accuPriceAud)}`,
    } : part),
  } : null;
  const nz = !inAustralia(site);
  const toFix = () => p.go({ page: "fix", siteId: site.id });

  return (
    <main className="page">
      <PageHead step="Step 4 · Fund" title={`What it takes to fix ${name}`} sub="Pre-feasibility screening: a guide to what to study first, not a business case." />

      {noProject ? (
        <div className="headline">
          <p className="big">
            {name} already captures about {Math.round(site.existingCapture * 100)}% of its methane, so at a{" "}
            {Math.round(a.captureEfficiency * 100)}% target there is no new project to fund.
          </p>
          <button type="button" className="cta light" onClick={toFix}>
            ← Raise the target
          </button>
        </div>
      ) : (
        <>
          <div className="headline">
            <p className="eyebrow light">Budget needed</p>
            <p className="big">
              Budget about <span className="num">{fmtAudM(r.capexMidAud)}</span> to make {name} a methane capture site.
            </p>
            <p className="muted">
              It would capture {fmtInt(r.capturedTCH4PerYear)} t of extra methane a year from {a.commissioningYear} and avoid{" "}
              {fmtT(r.abatementToHorizonTCO2e)} tCO₂-e by {a.horizonYear}.
              <Info label="What the budget covers">
                Range {fmtAudM(r.capexAud[0])} to {fmtAudM(r.capexAud[1])} for gas collection, a flare and{" "}
                {(r.electricKW / 1000).toFixed(1)} MW of engines, benchmarked against US EPA landfill gas project costs converted to
                AUD.
              </Info>
            </p>
          </div>

          <div className="stats fund-stats">
            <Stat label="Electricity" value={`${fmtT(r.electricityMWhPerYear / 1000)} GWh/yr`} info={`${(r.electricKW / 1000).toFixed(1)} MW of engines running on the captured gas only.`} tone="sky" />
            <Stat label="Power sales" value={`${fmtAudM(r.annualRevenueAud)}/yr`} info={`At ${fmtMoney(a.powerPriceAudPerMWh)}/MWh. Running costs are ${fmtAudM(r.annualOpexAud)}/yr.`} />
            <Stat
              label="Carbon credits"
              value={nz ? creditScheme(site) : `${fmtAudM(potentialAccuAud(site, r.generationTCH4PerYear, a))}/yr`}
              info={
                nz
                  ? "Credits are not modelled outside Australia."
                  : `Potential ACCUs at ${fmtMoney(a.accuPriceAud)} each, subject to eligibility under the landfill gas method. Only capture above the method's baseline (${Math.round(a.accuBaselineProportion * 100)}%) counts.`
              }
            />
            <Stat label="Net cost per tonne" value={fmtCostPerT(r.netCostAudPerTCO2e)} info={`Range ${fmtCostPerT(r.netCostAudPerTCO2eRange[0])} to ${fmtCostPerT(r.netCostAudPerTCO2eRange[1])}, excluding credits. Build and running costs minus power sales, over the project life, per tonne of CO₂-e avoided.`} tone="accent" />
            <Stat
              label="Simple payback"
              value={r.simplePaybackYears === null ? "None" : `${r.simplePaybackYears.toFixed(1)} yrs`}
              sub={a.includeAccu && !nz ? "including potential ACCUs" : "on electricity alone"}
            />
          </div>
          <HomesPowered site={site} electricityMWhPerYear={r.electricityMWhPerYear} />
          {!nz && (
            <p className="insight">
              {r.netCostAudPerTCO2e < a.accuPriceAud
                ? `At ${fmtCostPerT(r.netCostAudPerTCO2e)} a tonne, this costs less than the ${fmtMoney(a.accuPriceAud)} carbon credit price, so credits could make it viable even where electricity alone does not. Western Downs' Winfields Road landfill funded its flare entirely through ACCUs in 2025.`
                : `At ${fmtCostPerT(r.netCostAudPerTCO2e)} a tonne, this costs more than the ${fmtMoney(a.accuPriceAud)} carbon credit price.`}
            </p>
          )}
        </>
      )}

      <div className="split fund">
        <Cop31Card score={score} />
        {!noProject && (
          <article className="card">
            <h2 className="card-title">
              Methane over the project life
              <Info label="Short-term view">
                Over 20 years methane traps about 81 times as much heat as CO₂, against 28 over 100 years. On that 20-year view
                the project avoids {fmtT(r.abatementToHorizonTCO2eGwp20)} tCO₂-e by {a.horizonYear}.
              </Info>
            </h2>
            <GenerationChart years={r.years} horizonYear={a.horizonYear} capturedShare={Math.max(0, a.captureEfficiency - site.existingCapture)} width={520} height={320} />
            <p className="small muted">
              <span className="key line" /> methane the site makes <span className="key area" /> extra methane the project captures
            </p>
          </article>
        )}
      </div>

      <section className="compare">
        <h2 className="section-title">How {name} compares</h2>
        <p className="page-sub">
          Every landfill, cheapest tonne first, with what each one does best. Move the budget to see what gets funded.
        </p>
        <Headline
          portfolio={p.portfolio}
          totalSites={p.portfolio.bars.length}
          horizonYear={a.horizonYear}
          budget={p.budget}
          maxBudget={p.maxBudget}
          budgetShare={p.budgetShare}
          onBudgetShare={p.setBudgetShare}
        />
        <SiteCompare
          sites={p.sites}
          results={p.results}
          portfolio={p.portfolio}
          assumptions={a}
          selectedId={site.id}
          onSelect={(id) => p.go({ page: "fund", siteId: id })}
        />
        <div className="card">
          <h2 className="card-title">
            Cost curve
            <Info label="How to read the cost curve">
              Each bar is a site. Height is the net cost per tonne (the line shows its range); width is tonnes avoided a year. Dark
              green bars fit the budget; grey ones do not.
            </Info>
          </h2>
          <Macc portfolio={p.portfolio} results={p.results} sites={p.sites} selectedId={site.id} onSelect={(id) => p.go({ page: "fund", siteId: id })} accuPrice={a.accuPriceAud} />
        </div>
      </section>

      <div className="actions">
        <button type="button" className="ghost" onClick={toFix}>
          ← Change the answers
        </button>
        <button type="button" className="cta" onClick={() => p.go({ page: "plan", siteId: site.id })}>
          Get the site plan →
        </button>
        <a className="ghost" href="#/">
          Check another landfill
        </a>
      </div>

      <footer className="limits">
        <p>
          <strong>Pre-feasibility screening, not a business case.</strong> Emissions avoided use GWP100 = 28. Capex is a range
          benchmarked against US EPA landfill gas project costs converted to AUD. NZ and Fiji sites use the same AUD cost and power
          assumptions. Methods, sources and disclosures are in docs/ in the project repository.
        </p>
      </footer>
    </main>
  );
}
