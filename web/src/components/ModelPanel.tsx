import { fmtInt, fmtT } from "../format";
import type { Assumptions, Site, SiteResult } from "../model/types";
import { GenerationChart } from "./GenerationChart";
import { Stat } from "./Stat";

type Props = { site: Site; result: SiteResult; assumptions: Assumptions };

export function ModelPanel({ site, result, assumptions }: Props) {
  const headroom = Math.max(0, assumptions.captureEfficiency - site.existingCapture);
  return (
    <div className="stage-body">
      <div className="stats">
        <Stat label={`Methane generated in ${assumptions.commissioningYear}`} value={`${fmtInt(result.generationTCH4PerYear)} t`} sub="CH₄ per year, first-order decay model" />
        <Stat label="Already captured" value={`${Math.round(site.existingCapture * 100)}%`} sub={site.illustrative ? "proxy or operator-reported" : "sourced"} />
        <Stat label="Extra capture from project" value={`${fmtInt(result.capturedTCH4PerYear)} t`} sub={`CH₄ per year, raising capture to ${Math.round(assumptions.captureEfficiency * 100)}%`} tone="sky" />
        <Stat
          label="Estimated emissions avoided"
          value={`${fmtT(result.avgAbatementTCO2ePerYear)} t`}
          sub={`CO₂-e per year (GWP100 = ${assumptions.gwp100}), life average`}
          tone="accent"
        />
      </div>
      {headroom === 0 ? (
        <p className="notice">
          This site already captures {Math.round(site.existingCapture * 100)}% of its methane, at or above the
          {" "}
          {Math.round(assumptions.captureEfficiency * 100)}% target, so a new project adds nothing here. Raise the target
          to see any remaining headroom.
        </p>
      ) : (
        <figure className="chart-card">
          <GenerationChart years={result.years} horizonYear={assumptions.horizonYear} capturedShare={headroom} />
          <figcaption>
            <span className="key line" /> Methane generated <span className="key area" /> Extra methane captured by the
            project · cumulative to {assumptions.horizonYear}: <strong>{fmtT(result.abatementToHorizonTCO2e)} tCO₂-e</strong>{" "}
            <span className="muted">(GWP20 view: {fmtT(result.abatementToHorizonTCO2eGwp20)})</span>
          </figcaption>
        </figure>
      )}
      <p className="fine">
        k = {site.k} /yr, L0 = {site.L0} m³/t (screening defaults). {site.notes}
      </p>
    </div>
  );
}
