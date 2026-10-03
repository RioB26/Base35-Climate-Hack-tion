import { fmtAudM, fmtT } from "../format";
import type { Portfolio } from "../model/macc";

type Props = { siteCount: number; nzCount: number; allFunded: Portfolio; horizonYear: number };

const STEPS = [
  ["see", "See", "An independent Sentinel-5P check: is methane higher downwind of the site than upwind?"],
  ["model", "Model", "How much methane each landfill generates, and how much more a capture project could collect."],
  ["act", "Act", "What capture plus electricity costs and earns, and the net cost per tonne of CO₂-e avoided."],
  ["rank", "Rank", "Sites sorted by cost per tonne, with a budget slider that shows what to fund first."],
] as const;

export function Home({ siteCount, nzCount, allFunded, horizonYear }: Props) {
  return (
    <section id="home" className="hero">
      <p className="eyebrow">Climate Hack-tion 2026 · Zero waste and methane reduction · Build for 2035</p>
      <h1>
        Which landfills should we <em>fund first</em>?
      </h1>
      <p className="lede">
        Existing systems tell you where methane is. Methane Payback is an open pre-feasibility screen that helps
        Australian and New Zealand decision-makers decide which landfill gas projects to fund, and what they could
        achieve by {horizonYear}.
      </p>
      <div className="kpis">
        <div className="kpi">
          <span className="kpi-num">{siteCount}</span>
          <span className="kpi-label">
            landfills screened ({siteCount - nzCount} AU, {nzCount} NZ)
          </span>
        </div>
        <div className="kpi">
          <span className="kpi-num">{fmtT(allFunded.fundedAbatementToHorizon)}</span>
          <span className="kpi-label">tCO₂-e avoidable by {horizonYear} if every site with headroom is funded</span>
        </div>
        <div className="kpi">
          <span className="kpi-num">{fmtAudM(allFunded.fundedCapexAud)}</span>
          <span className="kpi-label">estimated capex for those projects (mid)</span>
        </div>
      </div>
      <a href="#see" className="cta">
        Start with the sites ↓
      </a>

      <ol className="steps">
        {STEPS.map(([id, title, text], i) => (
          <li key={id}>
            <a href={`#${id}`}>
              <span className="step-num">{i + 1}</span>
              <span className="step-title">{title}</span>
              <span className="step-text">{text}</span>
            </a>
          </li>
        ))}
      </ol>

      <div className="gap">
        <div>
          <h3>What already exists</h3>
          <p>
            Satellite detection and alerts (GHGSat, Carbon Mapper, UNEP MARS) and US single-site cost tools (EPA
            LFGcost-Web).
          </p>
        </div>
        <div>
          <h3>What we add</h3>
          <p>
            An open, Australia and NZ decision layer: local prices and carbon credits, transparent assumptions, and a
            portfolio view of what to fund first.
          </p>
        </div>
      </div>
    </section>
  );
}
