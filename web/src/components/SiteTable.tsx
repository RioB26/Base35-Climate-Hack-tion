import { fmtAudM, fmtCostPerT, fmtT } from "../format";
import type { Portfolio } from "../model/macc";
import type { Site, SiteResult } from "../model/types";

type Props = {
  sites: Site[];
  results: SiteResult[];
  portfolio: Portfolio;
  selectedId: string;
  onSelect: (id: string) => void;
};

/** Table version of the MACC: doubles as the site picker and the chart's text alternative. */
export function SiteTable({ sites, results, portfolio, selectedId, onSelect }: Props) {
  const order = portfolio.bars.map((b) => b.siteId);
  const rows = [...results].sort((a, b) => {
    const ia = order.indexOf(a.siteId);
    const ib = order.indexOf(b.siteId);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  });
  const funded = new Set(portfolio.bars.filter((b) => b.funded).map((b) => b.siteId));

  return (
    <div className="table-wrap">
    <table className="sites">
      <thead>
        <tr>
          <th>Site</th>
          <th className="r">AUD/tCO₂-e</th>
          <th className="r">tCO₂-e/yr</th>
          <th className="r">Capex (mid)</th>
          <th>Funded</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => {
          const s = sites.find((x) => x.id === r.siteId)!;
          return (
            <tr
              key={r.siteId}
              className={r.siteId === selectedId ? "selected" : ""}
              onClick={() => onSelect(r.siteId)}
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && onSelect(r.siteId)}
            >
              <td>
                {s.name}
                {s.illustrative && <span className="tag">proxy inputs</span>}
              </td>
              <td className="r">{fmtCostPerT(r.netCostAudPerTCO2e)}</td>
              <td className="r">{fmtT(r.avgAbatementTCO2ePerYear)}</td>
              <td className="r">{fmtAudM(r.capexMidAud)}</td>
              <td>{!Number.isFinite(r.netCostAudPerTCO2e) ? <span className="muted">No headroom</span> : funded.has(r.siteId) ? "Yes" : "No"}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
    </div>
  );
}
