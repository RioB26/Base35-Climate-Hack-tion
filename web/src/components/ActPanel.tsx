import { fmtAudM, fmtCostPerT, fmtT } from "../format";
import type { Assumptions, Site, SiteResult } from "../model/types";
import { Stat } from "./Stat";

export function ActPanel({ site, result, assumptions }: { site: Site; result: SiteResult; assumptions: Assumptions }) {
  const [lo, hi] = result.capexAud;
  const [clo, chi] = result.netCostAudPerTCO2eRange;
  const noHeadroom = !Number.isFinite(result.netCostAudPerTCO2e);
  if (noHeadroom) {
    return <p className="notice">No extra capture at this target, so there is no project to cost for this site.</p>;
  }
  const belowAccu = result.netCostAudPerTCO2e < assumptions.accuPriceAud;
  return (
    <div className="stage-body">
      <div className="stats">
        <Stat
          label="Net cost per tonne avoided"
          value={fmtCostPerT(result.netCostAudPerTCO2e)}
          sub={`levelised; ${fmtCostPerT(clo)} to ${fmtCostPerT(chi)} across the capex range`}
          tone="accent"
        />
        <Stat label="Capex range" value={`${fmtAudM(lo)} to ${fmtAudM(hi)}`} sub="collection, flare and engines" />
        <Stat
          label="Generation plant"
          value={`${(result.electricKW / 1000).toFixed(1)} MW`}
          sub={`${fmtT(result.electricityMWhPerYear / 1000)} GWh per year`}
          tone="sky"
        />
        <Stat
          label="Simple payback"
          value={result.simplePaybackYears === null ? "None" : `${result.simplePaybackYears.toFixed(1)} yrs`}
          sub={assumptions.includeAccu ? "including potential ACCU revenue*" : "on electricity alone"}
        />
      </div>
      <dl className="ledger">
        <dt>Electricity revenue</dt>
        <dd>
          {fmtAudM(result.annualRevenueAud)} / yr <span className="muted">at AUD {assumptions.powerPriceAudPerMWh}/MWh</span>
        </dd>
        <dt>Operating cost</dt>
        <dd>{fmtAudM(result.annualOpexAud)} / yr</dd>
        {assumptions.includeAccu && (
          <>
            <dt>Potential ACCU revenue*</dt>
            <dd>{site.state === "NZ" ? "Not applicable (NZ ETS, not modelled)" : `${fmtAudM(result.annualAccuRevenueAud)} / yr`}</dd>
          </>
        )}
        <dt>Avoided by {assumptions.horizonYear}</dt>
        <dd>{fmtT(result.abatementToHorizonTCO2e)} tCO₂-e</dd>
      </dl>
      {site.state !== "NZ" && (
        <p className="insight">
          {belowAccu
            ? `At ${fmtCostPerT(result.netCostAudPerTCO2e)} per tonne, this project costs less than the AUD ${assumptions.accuPriceAud} ACCU price, so carbon credits could make it viable even where electricity alone does not.`
            : `At ${fmtCostPerT(result.netCostAudPerTCO2e)} per tonne, this project costs more than the AUD ${assumptions.accuPriceAud} ACCU price.`}
        </p>
      )}
      {assumptions.includeAccu && (
        <p className="fine">
          *Subject to project eligibility and registration under the current ACCU landfill gas method. Only capture above
          the method's baseline proportion ({Math.round(assumptions.accuBaselineProportion * 100)}%) is counted. Price is
          the generic ACCU spot price.
        </p>
      )}
    </div>
  );
}
