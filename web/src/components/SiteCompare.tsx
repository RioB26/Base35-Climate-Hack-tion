import { fmtT, shortName } from "../format";
import { useMoney } from "./currency";
import { compareSites, TIE_SHARE, type Strength } from "../model/compare";
import type { Portfolio } from "../model/macc";
import type { Assumptions, Site, SiteResult } from "../model/types";

type Props = {
  sites: Site[];
  results: SiteResult[];
  portfolio: Portfolio;
  assumptions: Assumptions;
  selectedId: string;
  onSelect: (id: string) => void;
};

const STRENGTH_LABEL: Record<Strength, string> = {
  cheapest: "Cheapest tonne",
  first: "Top of the ranking, just",
  most: "Cuts the most methane",
  smallest: "Cheapest to start",
  payback: "Fastest payback",
  covers: "Power pays its running costs",
};

/** One card per site saying what it does best and why it sits where it does in the ranking. Doubles as the site picker. */
export function SiteCompare({ sites, results, portfolio, assumptions: a, selectedId, onSelect }: Props) {
  const { fmtAudM, fmtCostPerT } = useMoney();
  const cmp = compareSites(results, a.projectLifeYears);
  const byId = new Map(results.map((r) => [r.siteId, r]));
  const siteOf = (id: string) => sites.find((s) => s.id === id)!;
  const nameOf = (id: string) => shortName(siteOf(id).name);
  const funded = new Set(portfolio.bars.filter((b) => b.funded).map((b) => b.siteId));

  const ranked = cmp.rows.filter((r) => r.rank !== null).map((r) => byId.get(r.siteId)!);
  const idle = cmp.rows.filter((r) => r.rank === null).map((r) => r.siteId);
  const maxT = Math.max(1, ...ranked.map((r) => r.avgAbatementTCO2ePerYear));
  const maxCapex = Math.max(1, ...ranked.map((r) => r.capexMidAud));
  const maxCost = Math.max(1, ...ranked.map((r) => r.netCostAudPerTCO2e));
  const top = cmp.topId ? byId.get(cmp.topId)! : null;
  const leader = (s: Strength) => cmp.rows.find((r) => r.strengths.includes(s))?.siteId;
  const most = leader("most");
  const smallest = leader("smallest");
  const tie = `${Math.round(TIE_SHARE * 100)}%`;

  const summary = () => {
    if (!top) return "No site has methane left to capture at this target. Raise the target on the Fix step to compare them.";
    if (ranked.length === 1) return `${nameOf(top.siteId)} is the only site with methane left to capture at this target.`;
    const costs = ranked.map((r) => r.netCostAudPerTCO2e);
    const size =
      smallest && most && smallest !== most
        ? ` ${nameOf(smallest)} is the cheapest to start (${fmtAudM(byId.get(smallest)!.capexMidAud)}), and ${nameOf(most)} cuts the most methane (${fmtT(byId.get(most)!.avgAbatementTCO2ePerYear)} tCO₂-e a year).`
        : "";
    if (cmp.allTied)
      return `All ${ranked.length} sites cost about ${fmtCostPerT(Math.min(...costs))} to ${fmtCostPerT(Math.max(...costs))} a tonne, so none is clearly cheaper and the order between them can flip if you change an answer. The real choice is size.${size}`;
    return `${nameOf(top.siteId)} gives the cheapest tonne at ${fmtCostPerT(top.netCostAudPerTCO2e)}.${size}`;
  };

  return (
    <div className="site-compare">
      <p className="compare-summary">
        <strong>The short version: </strong>
        {summary()}
        {idle.length > 0 &&
          ` ${listNames(idle.map(nameOf))} already ${idle.length === 1 ? "captures" : "capture"} most of ${idle.length === 1 ? "its" : "their"} methane, so there is little left to fund there.`}
      </p>
      <div className="compare-grid">
        {cmp.rows.map((row) => {
          const s = siteOf(row.siteId);
          const r = byId.get(row.siteId)!;
          const name = shortName(s.name);
          const state = row.rank === null ? "none" : funded.has(row.siteId) ? "funded" : "unfunded";
          const why =
            row.rank === null
              ? `Already captures about ${Math.round(s.existingCapture * 100)}% of its methane, above the ${Math.round(a.captureEfficiency * 100)}% target, so there is nothing new to fund. It shows what good looks like.`
              : row.rank === 1
                ? cmp.rows.some((x) => x.tiedWithTop)
                  ? `First by a small margin: ${fmtCostPerT(r.netCostAudPerTCO2e)} a tonne, within ${tie} of the next site.`
                  : `First because each tonne avoided costs ${fmtCostPerT(r.netCostAudPerTCO2e)}, the lowest here.`
                : row.tiedWithTop
                  ? `Costs about the same per tonne as ${nameOf(cmp.topId!)} (${fmtCostPerT(r.netCostAudPerTCO2e)}), so choose it for its size, not its price.`
                  : `${fmtCostPerT(row.gapPerT)} a tonne dearer than ${nameOf(cmp.topId!)}, mostly because ${
                      row.driver === "capex"
                        ? "the plant costs more for each tonne it avoids."
                        : "power sales cover less of its running costs."
                    }`;
          return (
            <article
              key={row.siteId}
              className={`compare-card ${state} ${row.siteId === selectedId ? "selected" : ""}`}
              onClick={() => onSelect(row.siteId)}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onSelect(row.siteId)}
              tabIndex={0}
              role="button"
              aria-pressed={row.siteId === selectedId}
            >
              <header>
                <span className="rank">{row.rank ?? "–"}</span>
                <h3>
                  {name}
                  {s.illustrative && <span className="tag">proxy inputs</span>}
                </h3>
              </header>
              <ul className="chips">
                {row.rank === null ? <li className="good">Already well run</li> : row.strengths.map((k) => <li key={k}>{STRENGTH_LABEL[k]}</li>)}
              </ul>
              {row.rank !== null && (
                <dl className="metrics">
                  <Metric label="Cost per tonne" value={fmtCostPerT(r.netCostAudPerTCO2e)} share={r.netCostAudPerTCO2e / maxCost} hint="lower is better" />
                  <Metric label="Avoided a year" value={`${fmtT(r.avgAbatementTCO2ePerYear)} t`} share={r.avgAbatementTCO2ePerYear / maxT} hint="higher is better" />
                  <Metric label="Upfront budget" value={fmtAudM(r.capexMidAud)} share={r.capexMidAud / maxCapex} hint="lower is easier" />
                </dl>
              )}
              <p className="why">{why}</p>
              <p className={`status ${state}`}>
                {state === "funded" ? "Funded at this budget" : state === "unfunded" ? "Not funded at this budget" : "Nothing to fund"}
              </p>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function Metric({ label, value, share, hint }: { label: string; value: string; share: number; hint: string }) {
  return (
    <div className="metric">
      <dt>
        {label} <span className="muted">· {hint}</span>
      </dt>
      <dd>
        <span className="metric-bar" aria-hidden="true">
          <span style={{ width: `${Math.max(3, Math.min(1, share) * 100)}%` }} />
        </span>
        <span className="metric-value">{value}</span>
      </dd>
    </div>
  );
}

function listNames(names: string[]) {
  return names.length < 2 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}
