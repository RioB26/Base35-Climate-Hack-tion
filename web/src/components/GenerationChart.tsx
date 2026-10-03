import { fmtInt } from "../format";
import type { YearRow } from "../model/types";

type Props = { years: YearRow[]; horizonYear: number; capturedShare: number };

const W = 1000;
const H = 280;
const M = { top: 16, right: 16, bottom: 28, left: 56 };

/** Methane generation over the project life, with the share the project captures shaded. */
export function GenerationChart({ years, horizonYear, capturedShare }: Props) {
  const max = Math.max(...years.map((y) => y.generationTCH4)) * 1.1 || 1;
  const iw = W - M.left - M.right;
  const ih = H - M.top - M.bottom;
  const x = (i: number) => M.left + (i / Math.max(1, years.length - 1)) * iw;
  const y = (v: number) => M.top + ih - (v / max) * ih;
  const line = years.map((r, i) => `${x(i)},${y(r.generationTCH4)}`).join(" ");
  const captured = years.map((r, i) => `${x(i)},${y(r.generationTCH4 * capturedShare)}`);
  const area = `${x(0)},${y(0)} ${captured.join(" ")} ${x(years.length - 1)},${y(0)}`;
  const hIdx = years.findIndex((r) => r.year === horizonYear);
  const ticks = [0, max / 2, max];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="genchart" role="img" aria-label="Methane generation and project capture by year">
      {ticks.map((t) => (
        <g key={t}>
          <line x1={M.left} x2={W - M.right} y1={y(t)} y2={y(t)} className="gridline" />
          <text x={M.left - 8} y={y(t) + 4} textAnchor="end" className="tick">
            {fmtInt(t)}
          </text>
        </g>
      ))}
      <polygon points={area} className="gen-area" />
      <polyline points={line} className="gen-line" />
      {hIdx >= 0 && (
        <g>
          <line x1={x(hIdx)} x2={x(hIdx)} y1={M.top} y2={M.top + ih} className="horizon" />
          <text x={x(hIdx) + 4} y={M.top + 10} className="tick">
            {horizonYear}
          </text>
        </g>
      )}
      {years.map((r, i) =>
        i % 2 === 0 ? (
          <text key={r.year} x={x(i)} y={H - 8} textAnchor="middle" className="tick">
            {r.year}
          </text>
        ) : null,
      )}
      <text x={12} y={M.top + ih / 2} transform={`rotate(-90 12 ${M.top + ih / 2})`} textAnchor="middle" className="axis">
        t CH₄ per year
      </text>
    </svg>
  );
}
