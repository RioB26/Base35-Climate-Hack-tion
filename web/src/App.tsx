import { useMemo, useState } from "react";
import { ActPanel } from "./components/ActPanel";
import { Headline } from "./components/Headline";
import { Macc } from "./components/Macc";
import { ModelPanel } from "./components/ModelPanel";
import { SeePanel } from "./components/SeePanel";
import { SiteTable } from "./components/SiteTable";
import { Sliders } from "./components/Sliders";
import { defaultAssumptions } from "./data/assumptions";
import satelliteData from "./data/satellite.json";
import sitesData from "./data/sites.json";
import { buildPortfolio } from "./model/macc";
import { computeSite } from "./model/project";
import type { Assumptions, SatelliteResult, Site } from "./model/types";

const sites = sitesData as Site[];
const satellite = satelliteData as Record<string, SatelliteResult>;
const notRun: SatelliteResult = {
  status: "not_run",
  overpassesUsed: 0,
  windowStart: null,
  windowEnd: null,
  deltaPpb: null,
  ci95Ppb: null,
  confidence: null,
  note: "Satellite pipeline not run for this site.",
};

export default function App() {
  const [assumptions, setAssumptions] = useState<Assumptions>(defaultAssumptions);
  const [selectedId, setSelectedId] = useState(sites[0].id);

  const results = useMemo(() => sites.map((s) => computeSite(s, assumptions)), [assumptions]);
  const maxBudget = useMemo(
    () => results.filter((r) => Number.isFinite(r.netCostAudPerTCO2e)).reduce((s, r) => s + r.capexMidAud, 0),
    [results],
  );
  const [budgetShare, setBudgetShare] = useState(0.6);
  const budget = budgetShare * maxBudget;
  const portfolio = useMemo(() => buildPortfolio(results, budget), [results, budget]);

  const site = sites.find((s) => s.id === selectedId)!;
  const result = results.find((r) => r.siteId === selectedId)!;
  const anyIllustrative = sites.some((s) => s.illustrative);

  return (
    <div className="page">
      <header className="top">
        <div>
          <h1>Methane Payback</h1>
          <p className="sub">Australia and NZ landfill methane capture: a pre-feasibility screen</p>
        </div>
      </header>

      {anyIllustrative && (
        <div className="banner" role="note">
          Screening inputs: some site values are proxies (marked per site). Treat rankings as illustrative until the proxies are verified.
        </div>
      )}

      <Headline
        portfolio={portfolio}
        totalSites={results.length}
        horizonYear={assumptions.horizonYear}
        budget={budget}
        maxBudget={maxBudget}
        budgetShare={budgetShare}
        onBudgetShare={setBudgetShare}
      />

      <main className="grid">
        <section className="card">
          <h2>What to fund first</h2>
          <p className="hint">
            Each bar is a landfill, sorted by net cost per tonne of CO₂-e abated. Bar width is tonnes abated per year.
            Click a bar to inspect it.
          </p>
          <Macc
            portfolio={portfolio}
            results={results}
            sites={sites}
            selectedId={selectedId}
            onSelect={setSelectedId}
            accuPrice={assumptions.accuPriceAud}
          />
          <SiteTable
            sites={sites}
            results={results}
            portfolio={portfolio}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        </section>

        <section className="card">
          <h2>{site.name}</h2>
          <p className="hint">
            {site.state} · {site.notes}
          </p>
          <div className="panels">
            <SeePanel result={satellite[site.id] ?? notRun} />
            <ModelPanel site={site} result={result} assumptions={assumptions} />
            <ActPanel result={result} assumptions={assumptions} />
          </div>
        </section>
      </main>

      <section className="card">
        <h2>Assumptions</h2>
        <Sliders value={assumptions} onChange={setAssumptions} onReset={() => setAssumptions(defaultAssumptions)} />
      </section>

      <footer className="limits">
        <p>
          <strong>Pre-feasibility screening, not a business case.</strong> It ranks candidates for a detailed feasibility
          study. Emissions avoided use GWP100 = 28. Capex is shown as a range
          {", benchmarked against US EPA landfill gas project costs converted to AUD (see docs/DISCLOSURES.md)"}
          . The satellite panel is a screening signal, not a facility-level emissions
          measurement: Sentinel-5P pixels are about 5.5 × 7 km and cannot attribute an enhancement to one facility.
        </p>
        <p>Methods, sources and disclosures are in the project repository (docs/).</p>
      </footer>
    </div>
  );
}
