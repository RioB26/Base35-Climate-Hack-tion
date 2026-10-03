import type { Cop31Score } from "../model/cop31";

/** The rubric, shown in full so anyone can check the score by hand. */
export function Cop31Card({ score }: { score: Cop31Score | null }) {
  if (!score) {
    return (
      <article className="card cop">
        <h2 className="card-title">COP31 alignment check</h2>
        <p className="muted">No project at this capture target, so there is nothing to score. Raise the target on the Fix step.</p>
      </article>
    );
  }
  const total = Math.round(score.total);
  const r = 44;
  const circ = 2 * Math.PI * r;
  return (
    <article className="card cop">
      <div className="cop-head">
        <svg viewBox="0 0 110 110" className="cop-ring" role="img" aria-label={`${total} out of 100`}>
          <circle cx={55} cy={55} r={r} className="track" />
          <circle cx={55} cy={55} r={r} className="fill" strokeDasharray={`${(total / 100) * circ} ${circ}`} transform="rotate(-90 55 55)" />
          <text x={55} y={60} textAnchor="middle" className="cop-num">
            {total}
          </text>
          <text x={55} y={76} textAnchor="middle" className="cop-of">
            of 100
          </text>
        </svg>
        <div>
          <h2 className="card-title">COP31 alignment check</h2>
          <p className="muted small">
            Our own published rubric, not an official COP31 score. Four parts worth 25 points each, tied to the Global Methane
            Pledge, the carbon price and the energy the site makes.
          </p>
        </div>
      </div>
      <ul className="cop-parts">
        {score.parts.map((p) => (
          <li key={p.key}>
            <div className="cop-row">
              <span className="cop-label">{p.label}</span>
              <span className="cop-val">{p.value}</span>
              <span className="cop-pts">
                {Math.round(p.points)} / {p.max}
              </span>
            </div>
            <span className="cop-bar">
              <span style={{ width: `${(p.points / p.max) * 100}%` }} />
            </span>
            <span className="cop-rule">{p.rule}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}
