import { fmtAudM, fmtCostPerT, fmtT } from "../format";
import type { Assumptions, SiteResult } from "../model/types";

export function ActPanel({ result, assumptions }: { result: SiteResult; assumptions: Assumptions }) {
  const [lo, hi] = result.capexAud;
  const [clo, chi] = result.netCostAudPerTCO2eRange;
  return (
    <article className="panel">
      <h3>
        <span className="step">Act</span> Capture plus electricity scenario
      </h3>
      <p className="metric">
        {fmtCostPerT(result.netCostAudPerTCO2e)} <span className="unit">per tCO₂-e (net, levelised)</span>
      </p>
      <p className="muted small">
        Range {fmtCostPerT(clo)} to {fmtCostPerT(chi)} across the capex range. Negative means electricity revenue
        exceeds costs.
      </p>
      <dl>
        <dt>Capex range</dt>
        <dd>
          {fmtAudM(lo)} to {fmtAudM(hi)}
        </dd>
        <dt>Generation plant</dt>
        <dd>
          {(result.electricKW / 1000).toFixed(2)} MW electric, {fmtT(result.electricityMWhPerYear / 1000)} GWh/yr
        </dd>
        <dt>Electricity revenue</dt>
        <dd>
          {fmtAudM(result.annualRevenueAud)}/yr <span className="muted">at AUD {assumptions.powerPriceAudPerMWh}/MWh</span>
        </dd>
        <dt>Operating cost</dt>
        <dd>{fmtAudM(result.annualOpexAud)}/yr</dd>
        {assumptions.includeAccu && (
          <>
            <dt>Potential ACCU revenue*</dt>
            <dd>{fmtAudM(result.annualAccuRevenueAud)}/yr</dd>
          </>
        )}
        <dt>Simple payback</dt>
        <dd>{result.simplePaybackYears === null ? "No payback on these assumptions" : `${result.simplePaybackYears.toFixed(1)} years`}</dd>
        <dt>Abated by {assumptions.horizonYear}</dt>
        <dd>{fmtT(result.abatementToHorizonTCO2e)} tCO₂-e</dd>
      </dl>
      {assumptions.includeAccu && (
        <p className="muted small">
          *Subject to project eligibility and registration under the current ACCU landfill gas method. Price is the generic ACCU spot price.
        </p>
      )}
    </article>
  );
}
