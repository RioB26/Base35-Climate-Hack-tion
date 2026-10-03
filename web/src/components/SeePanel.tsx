import type { SatelliteResult } from "../model/types";

const LABEL: Record<SatelliteResult["status"], string> = {
  elevated: "Elevated",
  neutral: "Neutral",
  inconclusive: "Inconclusive",
  not_run: "Not run",
};

/** Independent satellite screening signal. Never shown as tonnes, never fed into the model. */
export function SeePanel({ result }: { result: SatelliteResult }) {
  return (
    <article className="see-card">
      <p className="see-status">
        <span className={`badge ${result.status}`}>{LABEL[result.status]}</span>
        {result.confidence && <span className="muted"> · confidence {result.confidence}</span>}
      </p>
      <WindSchematic />
      <dl>
        <dt>Overpasses used</dt>
        <dd>{result.overpassesUsed}</dd>
        <dt>Downwind minus upwind</dt>
        <dd>
          {result.deltaPpb === null
            ? "n/a"
            : `${result.deltaPpb.toFixed(1)} ppb` +
              (result.ci95Ppb ? ` (95% CI ${result.ci95Ppb[0].toFixed(1)} to ${result.ci95Ppb[1].toFixed(1)})` : "")}
        </dd>
        {result.windowStart && (
          <>
            <dt>Window</dt>
            <dd>
              {result.windowStart} to {result.windowEnd}
            </dd>
          </>
        )}
      </dl>
      <p className="muted small">{result.note}</p>
      <p className="caveat">A screening signal, not a facility-level emissions measurement.</p>
    </article>
  );
}

/** Upwind and downwind sectors around the site, as used by the pipeline. */
function WindSchematic() {
  const sector = (dir: 1 | -1) => {
    const r0 = 18;
    const r1 = 46;
    const a = (30 * Math.PI) / 180;
    const p = (r: number, s: number) => `${60 + dir * r * Math.cos(s * a)},${50 + r * Math.sin(s * a)}`;
    return `M ${p(r0, -1)} L ${p(r1, -1)} A ${r1} ${r1} 0 0 ${dir === 1 ? 1 : 0} ${p(r1, 1)} L ${p(r0, 1)} A ${r0} ${r0} 0 0 ${dir === 1 ? 0 : 1} ${p(r0, -1)} Z`;
  };
  return (
    <svg viewBox="0 0 120 100" className="schematic" role="img" aria-label="Upwind and downwind sectors around the site">
      <path d={sector(-1)} className="upwind" />
      <path d={sector(1)} className="downwind" />
      <circle cx={60} cy={50} r={4} className="site" />
      <line x1={8} y1={92} x2={44} y2={92} className="wind" markerEnd="url(#arrow)" />
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M0,0 L10,5 L0,10 z" className="windhead" />
        </marker>
      </defs>
      <text x={50} y={95} className="tiny">wind</text>
      <text x={14} y={14} className="tiny">upwind</text>
      <text x={78} y={14} className="tiny">downwind</text>
    </svg>
  );
}
