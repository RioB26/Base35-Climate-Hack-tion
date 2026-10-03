import { fmtT, shortName } from "../format";
import { useMoney } from "./currency";
import type { Portfolio } from "../model/macc";
import type { Site, SiteResult } from "../model/types";

type Props = {
  portfolio: Portfolio;
  results: SiteResult[];
  sites: Site[];
  selectedId: string;
  onSelect: (id: string) => void;
  accuPrice: number;
};

const W = 1000;
const H = 380;
const M = { top: 28, right: 16, bottom: 44, left: 72 };

/** Marginal abatement cost curve drawn as variable-width bars in plain SVG. */
export function Macc({ portfolio, results, sites, selectedId, onSelect, accuPrice }: Props) {
  const { currency, convert, fmtMoney, fmtCostPerT } = useMoney();
  const bars = portfolio.bars;
  if (bars.length === 0) return <p className="muted">No site has abatement under the current assumptions.</p>;

  const byId = new Map(results.map((r) => [r.siteId, r]));
  const totalX = bars.reduce((s, b) => s + b.widthT, 0);
  const highs = bars.map((b) => byId.get(b.siteId)!.netCostAudPerTCO2eRange[1]);
  const lows = bars.map((b) => byId.get(b.siteId)!.netCostAudPerTCO2eRange[0]);
  const yMax = Math.max(0, ...highs, accuPrice) * 1.15 || 1;
  const yMin = Math.min(0, ...lows) * 1.15;

  const iw = W - M.left - M.right;
  const ih = H - M.top - M.bottom;
  const x = (v: number) => M.left + (v / totalX) * iw;
  const y = (v: number) => M.top + ((yMax - v) / (yMax - yMin)) * ih;
  const ticks = niceTicks(yMin, yMax);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="macc" role="img" aria-label="Marginal abatement cost curve">
      {ticks.map((t) => (
        <g key={t}>
          <line x1={M.left} x2={W - M.right} y1={y(t)} y2={y(t)} className="gridline" />
          <text x={M.left - 6} y={y(t) + 4} textAnchor="end" className="tick">
            {Number(convert(t).toFixed(1))}
          </text>
        </g>
      ))}
      <text x={14} y={M.top + ih / 2} transform={`rotate(-90 14 ${M.top + ih / 2})`} textAnchor="middle" className="axis">
        Net {currency} per tCO₂-e
      </text>
      <text x={M.left + iw / 2} y={H - 6} textAnchor="middle" className="axis">
        Abatement, tCO₂-e per year (cumulative, average over project life)
      </text>

      {bars.map((b) => {
        const r = byId.get(b.siteId)!;
        const name = shortName(sites.find((s) => s.id === b.siteId)!.name);
        const x0 = x(b.x0) + 1;
        const x1 = x(b.x0 + b.widthT) - 1;
        const top = y(Math.max(0, b.costPerT));
        const bottom = y(Math.min(0, b.costPerT));
        const cx = (x0 + x1) / 2;
        const [lo, hi] = r.netCostAudPerTCO2eRange;
        return (
          <g
            key={b.siteId}
            className={`bar ${b.funded ? "funded" : "unfunded"} ${b.siteId === selectedId ? "selected" : ""}`}
            onClick={() => onSelect(b.siteId)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onSelect(b.siteId)}
          >
            <title>
              {`${name}: ${fmtCostPerT(b.costPerT)}/t (range ${fmtCostPerT(lo)} to ${fmtCostPerT(hi)}), ${fmtT(b.widthT)} tCO₂-e/yr, ${b.funded ? "funded" : "not funded"}`}
            </title>
            <rect x={x0} y={top} width={Math.max(1, x1 - x0)} height={Math.max(1, bottom - top)} rx={2} />
            <line x1={cx} x2={cx} y1={y(hi)} y2={y(lo)} className="whisker" />
            <text x={cx} y={Math.min(top, y(hi)) - 6} textAnchor="middle" className="barlabel">
              {name} {b.funded ? "✓" : ""}
            </text>
          </g>
        );
      })}

      <line x1={M.left} x2={W - M.right} y1={y(0)} y2={y(0)} className="zero" />
      <line x1={M.left} x2={W - M.right} y1={y(accuPrice)} y2={y(accuPrice)} className="accu" />
      <text x={W - M.right} y={y(accuPrice) - 4} textAnchor="end" className="tick">
        ACCU spot price reference ({fmtMoney(accuPrice)})
      </text>
    </svg>
  );
}

function niceTicks(min: number, max: number): number[] {
  const span = max - min;
  const raw = span / 5;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 5, 10].map((m) => m * mag).find((s) => span / s <= 6) ?? 10 * mag;
  const out: number[] = [];
  for (let t = Math.ceil(min / step) * step; t <= max; t += step) out.push(Number(t.toFixed(6)));
  return out;
}
