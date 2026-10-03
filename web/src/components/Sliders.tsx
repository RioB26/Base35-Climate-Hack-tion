import type { Assumptions } from "../model/types";

type NumKey = { [K in keyof Assumptions]: Assumptions[K] extends number ? K : never }[keyof Assumptions];

type Spec = { key: NumKey; label: string; min: number; max: number; step: number; show: (v: number) => string };

const pct = (v: number) => `${Math.round(v * 100)}%`;

const MAIN: Spec[] = [
  { key: "captureEfficiency", label: "Capture efficiency", min: 0.5, max: 0.95, step: 0.01, show: pct },
  { key: "engineEfficiency", label: "Engine efficiency", min: 0.3, max: 0.45, step: 0.01, show: pct },
  { key: "powerPriceAudPerMWh", label: "Power price", min: 30, max: 200, step: 5, show: (v) => `AUD ${v}/MWh` },
  { key: "capexMultiplier", label: "Capex multiplier", min: 0.5, max: 2, step: 0.05, show: (v) => `× ${v.toFixed(2)}` },
  { key: "discountRate", label: "Discount rate", min: 0.03, max: 0.12, step: 0.005, show: (v) => `${(v * 100).toFixed(1)}%` },
];

const ADVANCED: Spec[] = [
  { key: "commissioningYear", label: "Commissioning year", min: 2026, max: 2032, step: 1, show: String },
  { key: "projectLifeYears", label: "Project life", min: 10, max: 25, step: 1, show: (v) => `${v} years` },
  { key: "accuPriceAud", label: "ACCU price (placeholder)", min: 0, max: 80, step: 1, show: (v) => `AUD ${v}` },
];

type Props = { value: Assumptions; onChange: (a: Assumptions) => void; onReset: () => void };

export function Sliders({ value, onChange, onReset }: Props) {
  const row = (s: Spec) => (
    <label key={s.key} className="slider">
      <span>
        {s.label} <strong>{s.show(value[s.key])}</strong>
      </span>
      <input
        type="range"
        min={s.min}
        max={s.max}
        step={s.step}
        value={value[s.key]}
        onChange={(e) => onChange({ ...value, [s.key]: Number(e.target.value) })}
      />
    </label>
  );
  return (
    <div>
      <div className="sliders">{MAIN.map(row)}</div>
      <details>
        <summary>Advanced</summary>
        <div className="sliders">
          {ADVANCED.map(row)}
          <label className="toggle">
            <input
              type="checkbox"
              checked={value.includeAccu}
              onChange={(e) => onChange({ ...value, includeAccu: e.target.checked })}
            />{" "}
            Show potential ACCU revenue in payback
          </label>
        </div>
      </details>
      <button type="button" onClick={onReset}>
        Reset to defaults
      </button>
    </div>
  );
}
