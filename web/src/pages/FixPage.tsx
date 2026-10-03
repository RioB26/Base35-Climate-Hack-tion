import { Suspense, lazy } from "react";
import { PageHead } from "../components/Nav";
import { SliderGroup } from "../components/Sliders";
import { defaultAssumptions } from "../data/assumptions";
import { regionOf } from "../data";
import { fmtInt } from "../format";
import { useMoney } from "../components/currency";
import { sizeClass, stillOperating, wasteInPlace } from "../model/size";
import type { Assumptions, Site, SiteResult } from "../model/types";
import type { Route } from "../route";

const Landfill3D = lazy(() => import("../components/Landfill3D"));

type Props = { site: Site; result: SiteResult; assumptions: Assumptions; setAssumptions: (a: Assumptions) => void; go: (r: Route) => void };

const NOW = 2025;

export function FixPage({ site, result, assumptions: a, setAssumptions, go }: Props) {
  const { fmtAudM, fmtCostPerT } = useMoney();
  const size = sizeClass(site, NOW);
  const operating = stillOperating(site, NOW);
  const cap = Math.round(site.existingCapture * 100);
  const noHeadroom = a.captureEfficiency <= site.existingCapture;
  const nz = site.state === "NZ";

  return (
    <main className="page">
      <PageHead step="Step 3 · Fix" title={`Plan a capture project at ${site.name.split(",")[0]}`} sub="Answer a few questions about the site. Every answer updates the numbers and the model on the right." />
      <div className="split fix">
        <div className="col">
          <Question n={1} title="How much of the gas should the project capture?">
            <p className="q-note">
              The site already captures about {cap}% <span className="tag">{site.illustrative ? "proxy or operator-reported" : "sourced"}</span>.
              Only capture above that counts.
            </p>
            <SliderGroup keys={["captureEfficiency"]} value={a} onChange={setAssumptions} />
            {noHeadroom && (
              <p className="notice">
                The target is at or below what the site already captures, so a new project adds nothing. Raise it above {cap}% to
                see a project.
              </p>
            )}
          </Question>
          <Question n={2} title="When could it be running?">
            <SliderGroup keys={["commissioningYear"]} value={a} onChange={setAssumptions} />
          </Question>
          <Question n={3} title="What will the electricity earn?">
            <SliderGroup keys={["powerPriceAudPerMWh", "engineEfficiency"]} value={a} onChange={setAssumptions} />
          </Question>
          <Question n={4} title="What will it cost to build and finance?">
            <SliderGroup keys={["capexMultiplier", "discountRate", "projectLifeYears"]} value={a} onChange={setAssumptions} />
          </Question>
          <Question n={5} title="Should carbon credits count?">
            <SliderGroup keys={["accuPriceAud"]} value={a} onChange={setAssumptions} />
            <label className="toggle">
              <input type="checkbox" checked={a.includeAccu} onChange={(e) => setAssumptions({ ...a, includeAccu: e.target.checked })} />
              <span>
                Include potential ACCU revenue in the payback
                {nz && <span className="muted"> (not for NZ sites, which sit under the NZ ETS)</span>}
              </span>
            </label>
          </Question>
          <div className="actions">
            <button type="button" className="cta" onClick={() => go({ page: "fund", siteId: site.id })}>
              See the budget and results →
            </button>
            <button type="button" className="ghost" onClick={() => setAssumptions(defaultAssumptions)}>
              Reset answers
            </button>
          </div>
        </div>

        <div className="col sticky">
          <div className="scene-card">
            <Suspense fallback={<div className="landfill-3d fallback">Loading 3D model…</div>}>
              <Landfill3D size={size} operating={operating} existingCapture={site.existingCapture} targetCapture={a.captureEfficiency} />
            </Suspense>
            <div className="scene-legend">
              <span>
                <span className="swatch old" /> existing wells
              </span>
              <span>
                <span className="swatch new" /> new project wells
              </span>
              <span>
                <span className="swatch haze" /> methane still escaping
              </span>
            </div>
            <p className="scene-caption">
              {size[0].toUpperCase() + size.slice(1)} landfill: about {Math.round(wasteInPlace(site, NOW) / 1e6)} Mt of waste in
              place (modelled), {operating ? "still taking waste" : "closed"}. {regionOf(site)}. Illustrative, not to scale.
            </p>
          </div>
          <div className="live">
            <div>
              <span className="live-label">Extra methane captured</span>
              <span className="live-num">{fmtInt(result.capturedTCH4PerYear)} t/yr</span>
            </div>
            <div>
              <span className="live-label">Net cost per tonne CO₂-e</span>
              <span className="live-num">{fmtCostPerT(result.netCostAudPerTCO2e)}</span>
            </div>
            <div>
              <span className="live-label">Build cost (mid)</span>
              <span className="live-num">{noHeadroom ? "n/a" : fmtAudM(result.capexMidAud)}</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function Question({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="question">
      <h2>
        <span className="q-num">{n}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}
