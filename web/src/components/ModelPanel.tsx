import { fmtInt, fmtT } from "../format";
import type { Assumptions, Site, SiteResult } from "../model/types";

type Props = { site: Site; result: SiteResult; assumptions: Assumptions };

export function ModelPanel({ site, result, assumptions }: Props) {
  const horizonRows = result.years.filter((y) => y.year <= assumptions.horizonYear);
  return (
    <article className="panel">
      <h3>
        <span className="step">Model</span> Methane opportunity
      </h3>
      <dl>
        <dt>Methane generated ({assumptions.commissioningYear})</dt>
        <dd>{fmtInt(result.generationTCH4PerYear)} t CH₄/yr</dd>
        <dt>Already captured</dt>
        <dd>{Math.round(site.existingCapture * 100)}%</dd>
        <dt>Captured by project</dt>
        <dd>
          {fmtInt(result.capturedTCH4PerYear)} t CH₄/yr{" "}
          <span className="muted">
            (to {Math.round(assumptions.captureEfficiency * 100)}% total capture)
          </span>
        </dd>
        <dt>Estimated emissions avoided</dt>
        <dd>
          {fmtT(result.avgAbatementTCO2ePerYear)} tCO₂-e/yr <span className="muted">(GWP100 = {assumptions.gwp100}, life average)</span>
        </dd>
        <dt>Cumulative to {assumptions.horizonYear}</dt>
        <dd>
          {fmtT(result.abatementToHorizonTCO2e)} tCO₂-e
          <div className="muted small">
            20-year view (GWP20 = {assumptions.gwp20}): {fmtT(result.abatementToHorizonTCO2eGwp20)} tCO₂-e
          </div>
        </dd>
      </dl>
      <Sparkline values={result.years.map((y) => y.generationTCH4)} highlight={horizonRows.length} />
      <p className="muted small">
        Methane generation {result.years[0].year} to {result.years[result.years.length - 1].year} (first-order decay,
        k = {site.k}, L0 = {site.L0} m³/t){site.illustrative ? " · proxy inputs, see notes" : ""}
      </p>
    </article>
  );
}

function Sparkline({ values, highlight }: { values: number[]; highlight: number }) {
  const w = 240;
  const h = 48;
  const max = Math.max(...values) || 1;
  const pts = values.map((v, i) => `${(i / Math.max(1, values.length - 1)) * w},${h - (v / max) * (h - 4) - 2}`);
  const cut = (Math.max(0, highlight - 1) / Math.max(1, values.length - 1)) * w;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="spark" role="img" aria-label="Methane generation over the project life">
      <rect x={0} y={0} width={cut} height={h} className="sparkzone" />
      <polyline points={pts.join(" ")} className="sparkline" />
    </svg>
  );
}
