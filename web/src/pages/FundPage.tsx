import { Cop31Card } from "../components/Cop31Card";
import { GenerationChart } from "../components/GenerationChart";
import { Headline } from "../components/Headline";
import { Macc } from "../components/Macc";
import { PageHead } from "../components/Nav";
import { SiteTable } from "../components/SiteTable";
import { Stat } from "../components/Stat";
import { fmtInt, fmtT, shortName } from "../format";
import { useMoney } from "../components/currency";
import { cop31Score } from "../model/cop31";
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
  const nz = site.state === "NZ";
  const toFix = () => p.go({ page: "fix", siteId: site.id });

  return (
    <main className="page workspace">
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
              Budget about <span className="num">{fmtAudM(r.capexMidAud)}</span> for additional methane capture at {name}.
            </p>
            <p className="muted">
              Range {fmtAudM(r.capexAud[0])} to {fmtAudM(r.capexAud[1])} for gas collection, a flare and{" "}
              {(r.electricKW / 1000).toFixed(1)} MW of engines. It would capture {fmtInt(r.capturedTCH4PerYear)} t of extra methane
              a year from {a.commissioningYear} and avoid {fmtT(r.abatementToHorizonTCO2e)} tCO₂-e by {a.horizonYear}.
            </p>
          </div>

          <div className="stats fund-stats">
            <Stat label="Electricity" value={`${fmtT(r.electricityMWhPerYear / 1000)} GWh/yr`} sub={`${(r.electricKW / 1000).toFixed(1)} MW of engines on captured gas only`} tone="sky" />
            <Stat label="Power sales" value={`${fmtAudM(r.annualRevenueAud)}/yr`} sub={`at ${fmtMoney(a.powerPriceAudPerMWh)}/MWh; running costs ${fmtAudM(r.annualOpexAud)}/yr`} />
            <Stat
              label="Carbon credits"
              value={nz ? "NZ ETS" : `${fmtAudM(potentialAccuAud(site, r.generationTCH4PerYear, a))}/yr`}
              sub={nz ? "not modelled for NZ sites" : `potential ACCUs* at ${fmtMoney(a.accuPriceAud)}`}
            />
            <Stat label="Net cost per tonne" value={fmtCostPerT(r.netCostAudPerTCO2e)} sub={`${fmtCostPerT(r.netCostAudPerTCO2eRange[0])} to ${fmtCostPerT(r.netCostAudPerTCO2eRange[1])}, excluding credits`} tone="accent" />
            <Stat
              label="Simple payback"
              value={r.simplePaybackYears === null ? "None" : `${r.simplePaybackYears.toFixed(1)} yrs`}
              sub={a.includeAccu && !nz ? "including potential ACCUs*" : "on electricity alone"}
            />
          </div>
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
            <h2 className="card-title">Methane over the project life</h2>
            <GenerationChart years={r.years} horizonYear={a.horizonYear} capturedShare={Math.max(0, a.captureEfficiency - site.existingCapture)} width={520} height={320} />
            <p className="small muted">
              <span className="key line" /> methane the site makes <span className="key area" /> extra methane the project captures ·
              GWP20 view by {a.horizonYear}: {fmtT(r.abatementToHorizonTCO2eGwp20)} tCO₂-e
            </p>
          </article>
        )}
      </div>

      <section className="compare">
        <h2 className="section-title">How {name} compares</h2>
        <p className="page-sub">
          Every landfill with room for more capture, cheapest tonne first. Bar width is tonnes avoided a year. Move the budget to see
          what gets funded.
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
        <div className="card">
          <Macc portfolio={p.portfolio} results={p.results} sites={p.sites} selectedId={site.id} onSelect={(id) => p.go({ page: "fund", siteId: id })} accuPrice={a.accuPriceAud} />
          <SiteTable sites={p.sites} results={p.results} portfolio={p.portfolio} selectedId={site.id} onSelect={(id) => p.go({ page: "fund", siteId: id })} />
        </div>
      </section>

      <div className="actions">
        <button type="button" className="ghost" onClick={toFix}>
          ← Change the answers
        </button>
        <a className="cta" href="#/landfills">
          Check another landfill
        </a>
      </div>

      <footer className="limits">
        {!nz && (
          <p>
            *Potential ACCU revenue is subject to eligibility and registration under the landfill gas method. Only capture above the
            method's baseline ({Math.round(a.accuBaselineProportion * 100)}%) counts.
          </p>
        )}
        <p>
          <strong>Pre-feasibility screening, not a business case.</strong> Emissions avoided use GWP100 = 28. Capex is a range
          benchmarked against US EPA landfill gas project costs converted to AUD. NZ sites use the same AUD cost and power
          assumptions. Methods, sources and disclosures are in docs/ in the project repository.
        </p>
      </footer>
    </main>
  );
}
