import { fmtPpb } from "../format";
import type { Comparison } from "../model/discrepancy";

const W = 600;
const H = 120;
const M = { left: 16, right: 16 };

/** One-axis chart: the satellite's downwind-minus-upwind range against the signal the reported figures imply. */
export function SignalChart({ c }: { c: Comparison }) {
  if (c.observedPpb === null || !c.observedCi) return null;
  const [lo, hi] = c.observedCi;
  const min = Math.min(0, lo, c.expectedPpb);
  const max = Math.max(hi, c.expectedPpb);
  const pad = (max - min) * 0.08 || 1;
  const x = (v: number) => M.left + ((v - (min - pad)) / (max - min + 2 * pad)) * (W - M.left - M.right);
  const axisY = 78;
  // Keep labels inside the chart: anchor them to the side with room.
  const anchor = (px: number) => (px < W * 0.2 ? "start" : px > W * 0.8 ? "end" : "middle");
  const xo = x(c.observedPpb);
  const xe = x(c.expectedPpb);
  const step = niceStep(max - min);
  const ticks: number[] = [];
  for (let t = Math.ceil((min - pad) / step) * step; t <= max + pad; t += step) ticks.push(Number(t.toFixed(6)));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="signal" role="img" aria-label={`Satellite ${c.observedPpb.toFixed(1)} ppb (range ${lo.toFixed(1)} to ${hi.toFixed(1)}); reported figures imply ${c.expectedPpb.toFixed(1)} ppb`}>
      {ticks.map((t) => (
        <g key={t}>
          <line x1={x(t)} x2={x(t)} y1={axisY - 4} y2={axisY + 4} className={t === 0 ? "zero" : "gridline"} />
          <text x={x(t)} y={axisY + 22} textAnchor="middle" className="tick">
            {t}
          </text>
        </g>
      ))}
      <line x1={M.left} x2={W - M.right} y1={axisY} y2={axisY} className="gridline" />
      <text x={W - M.right} y={H - 2} textAnchor="end" className="tick">
        ppb, downwind minus upwind
      </text>

      <g className="obs">
        <title>{`Satellite: ${c.observedPpb.toFixed(1)} ppb, 95% range ${lo.toFixed(1)} to ${hi.toFixed(1)}`}</title>
        <rect x={x(lo)} y={axisY - 22} width={Math.max(2, x(hi) - x(lo))} height={10} rx={4} className="ci" />
        <circle cx={x(c.observedPpb)} cy={axisY - 17} r={6} className="dot" />
        <text x={xo} y={axisY - 30} textAnchor={anchor(xo)} className="label">
          Satellite {fmtPpb(c.observedPpb)}
        </text>
      </g>
      <g className="exp">
        <title>{`Expected from reported figures: ${fmtPpb(c.expectedPpb)} ppb`}</title>
        <path d={`M ${x(c.expectedPpb)} ${axisY - 8} l 7 8 l -7 8 l -7 -8 z`} className="diamond" />
        <text x={xe} y={axisY - 52} textAnchor={anchor(xe)} className="label">
          Reported implies {fmtPpb(c.expectedPpb)}
        </text>
        <line x1={x(c.expectedPpb)} x2={x(c.expectedPpb)} y1={axisY - 48} y2={axisY - 9} className="leader" />
      </g>
    </svg>
  );
}

function niceStep(span: number) {
  const raw = span / 5 || 1;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  return [1, 2, 5, 10].map((m) => m * mag).find((s) => span / s <= 6) ?? 10 * mag;
}
