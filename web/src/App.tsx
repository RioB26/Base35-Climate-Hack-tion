import { Suspense, lazy, useCallback, useMemo, useState } from "react";
import { ActPanel } from "./components/ActPanel";
import { Headline } from "./components/Headline";
import { Home } from "./components/Home";
import { Macc } from "./components/Macc";
import type { MethaneGrid } from "./components/MapView";
import { ModelPanel } from "./components/ModelPanel";
import { Nav } from "./components/Nav";
import { SeePanel } from "./components/SeePanel";
import { SitePicker } from "./components/SitePicker";
import { SiteTable } from "./components/SiteTable";
import { SliderGroup } from "./components/Sliders";
import { defaultAssumptions } from "./data/assumptions";
import methaneGridData from "./data/methaneGrid.json";
import satelliteData from "./data/satellite.json";
import sitesData from "./data/sites.json";
import { buildPortfolio } from "./model/macc";
import { computeSite } from "./model/project";
import type { Assumptions, SatelliteResult, Site } from "./model/types";

const MapView = lazy(() => import("./components/MapView"));

const sites = sitesData as Site[];
const satellite = satelliteData as Record<string, SatelliteResult>;
const methaneGrid = methaneGridData as MethaneGrid;
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

function StageHeader({ n, title, kicker, children }: { n: number; title: string; kicker: string; children?: React.ReactNode }) {
  return (
    <header className="stage-head">
      <span className="stage-num">{n}</span>
      <div>
        <p className="eyebrow">{kicker}</p>
        <h2>{title}</h2>
        {children && <p className="stage-intro">{children}</p>}
      </div>
    </header>
  );
}

export default function App() {
  const [assumptions, setAssumptions] = useState<Assumptions>(defaultAssumptions);
  const [selectedId, setSelectedId] = useState(sites[0].id);
  const select = useCallback((id: string) => setSelectedId(id), []);

  const results = useMemo(() => sites.map((s) => computeSite(s, assumptions)), [assumptions]);
  const maxBudget = useMemo(
    () => results.filter((r) => Number.isFinite(r.netCostAudPerTCO2e)).reduce((s, r) => s + r.capexMidAud, 0),
    [results],
  );
  const [budgetShare, setBudgetShare] = useState(0.6);
  const budget = budgetShare * maxBudget;
  const portfolio = useMemo(() => buildPortfolio(results, budget), [results, budget]);
  const allFunded = useMemo(() => buildPortfolio(results, Infinity), [results]);

  const status = useMemo(() => {
    const out: Record<string, "funded" | "unfunded" | "none"> = {};
    for (const s of sites) out[s.id] = "none";
    for (const b of portfolio.bars) out[b.siteId] = b.funded ? "funded" : "unfunded";
    return out;
  }, [portfolio]);

  const site = sites.find((s) => s.id === selectedId)!;
  const result = results.find((r) => r.siteId === selectedId)!;
  const anyProxy = sites.some((s) => s.illustrative);
  const picker = <SitePicker sites={sites} selectedId={selectedId} onSelect={select} />;

  return (
    <>
      <Nav />
      <main className="page">
        <Home siteCount={sites.length} nzCount={sites.filter((s) => s.state === "NZ").length} allFunded={allFunded} horizonYear={assumptions.horizonYear} />

        {anyProxy && (
          <p className="banner" role="note">
            Screening inputs: some site values are proxies or operator-reported (see each site's notes). Treat rankings as
            illustrative until they are verified.
          </p>
        )}

        <section id="see" className="stage">
          <StageHeader n={1} kicker="Satellite screening" title="See the sites">
            An independent check on each landfill: across many Sentinel-5P overpasses, is methane higher downwind than
            upwind? It never feeds the numbers below.
          </StageHeader>
          {picker}
          <div className="see-grid">
            <Suspense fallback={<div className="map map-loading">Loading map…</div>}>
              <MapView sites={sites} status={status} selectedId={selectedId} onSelect={select} grid={methaneGrid} />
            </Suspense>
            <SeePanel result={satellite[site.id] ?? notRun} />
          </div>
        </section>

        <section id="model" className="stage">
          <StageHeader n={2} kicker="Methane opportunity" title={`How much methane, and how much more can be captured?`}>
            A first-order decay model estimates methane generated each year from the waste in place. Only capture above
            what the site already collects counts.
          </StageHeader>
          {picker}
          <div className="stage-card">
            <h3 className="site-title">{site.name}</h3>
            <ModelPanel site={site} result={result} assumptions={assumptions} />
            <SliderGroup keys={["captureEfficiency", "commissioningYear"]} value={assumptions} onChange={setAssumptions} />
          </div>
        </section>

        <section id="act" className="stage">
          <StageHeader n={3} kicker="Investment scenario" title="What would capture plus electricity cost?">
            Capex is benchmarked against US EPA landfill gas project costs converted to AUD and shown as a range. The key
            output is the net cost per tonne of CO₂-e avoided.
          </StageHeader>
          {picker}
          <div className="stage-card">
            <h3 className="site-title">{site.name}</h3>
            <ActPanel site={site} result={result} assumptions={assumptions} />
            <SliderGroup
              keys={["powerPriceAudPerMWh", "engineEfficiency", "capexMultiplier", "discountRate", "projectLifeYears", "accuPriceAud"]}
              value={assumptions}
              onChange={setAssumptions}
            />
            <label className="toggle">
              <input
                type="checkbox"
                checked={assumptions.includeAccu}
                onChange={(e) => setAssumptions({ ...assumptions, includeAccu: e.target.checked })}
              />{" "}
              Include potential ACCU revenue in payback (Australian sites only)
            </label>
          </div>
        </section>

        <section id="rank" className="stage">
          <StageHeader n={4} kicker="Portfolio" title="What to fund first">
            Every site with capture headroom, sorted by net cost per tonne. Bar width is tonnes avoided per year. Move the
            budget to see which projects get funded and what they achieve by {assumptions.horizonYear}.
          </StageHeader>
          <Headline
            portfolio={portfolio}
            totalSites={portfolio.bars.length}
            horizonYear={assumptions.horizonYear}
            budget={budget}
            maxBudget={maxBudget}
            budgetShare={budgetShare}
            onBudgetShare={setBudgetShare}
          />
          <div className="stage-card">
            <Macc portfolio={portfolio} results={results} sites={sites} selectedId={selectedId} onSelect={select} accuPrice={assumptions.accuPriceAud} />
            <SiteTable sites={sites} results={results} portfolio={portfolio} selectedId={selectedId} onSelect={select} />
          </div>
          <button type="button" className="ghost" onClick={() => setAssumptions(defaultAssumptions)}>
            Reset all assumptions
          </button>
        </section>

        <footer className="limits">
          <p>
            <strong>Pre-feasibility screening, not a business case.</strong> It ranks candidates for a detailed feasibility
            study. Emissions avoided use GWP100 = 28. Capex is a range benchmarked against US EPA landfill gas project costs
            converted to AUD. NZ sites use the same AUD cost and power assumptions and sit under the NZ ETS, which is not
            modelled. The satellite panel is a screening signal, not a facility-level emissions measurement: Sentinel-5P
            pixels are about 5.5 × 7 km and cannot attribute an enhancement to one facility.
          </p>
          <p>Methods, sources and disclosures: docs/ in the project repository.</p>
        </footer>
      </main>
    </>
  );
}
