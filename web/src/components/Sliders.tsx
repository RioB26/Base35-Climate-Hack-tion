import type { Assumptions } from "../model/types";

type NumKey = { [K in keyof Assumptions]: Assumptions[K] extends number ? K : never }[keyof Assumptions];

type Spec = { label: string; min: number; max: number; step: number; show: (v: number) => string; hint?: string };

const pct = (v: number) => `${Math.round(v * 100)}%`;

const SPECS: Partial<Record<NumKey, Spec>> = {
  captureEfficiency: { label: "Target capture", min: 0.5, max: 0.98, step: 0.01, show: pct, hint: "Share of generated methane collected once the project is built" },
  commissioningYear: { label: "Commissioning year", min: 2026, max: 2032, step: 1, show: String },
  engineEfficiency: { label: "Engine efficiency", min: 0.3, max: 0.45, step: 0.01, show: pct },
  powerPriceAudPerMWh: { label: "Power price", min: 30, max: 200, step: 5, show: (v) => `AUD ${v}/MWh` },
  capexMultiplier: { label: "Capex multiplier", min: 0.5, max: 2, step: 0.05, show: (v) => `× ${v.toFixed(2)}` },
  discountRate: { label: "Discount rate", min: 0.03, max: 0.12, step: 0.005, show: (v) => `${(v * 100).toFixed(1)}%` },
  projectLifeYears: { label: "Project life", min: 10, max: 25, step: 1, show: (v) => `${v} years` },
  accuPriceAud: { label: "ACCU price", min: 0, max: 80, step: 1, show: (v) => `AUD ${v}` },
};

type Props = { keys: NumKey[]; value: Assumptions; onChange: (a: Assumptions) => void };

/** A group of sliders for one stage of the analysis. */
export function SliderGroup({ keys, value, onChange }: Props) {
  return (
    <div className="sliders">
      {keys.map((key) => {
        const s = SPECS[key]!;
        return (
          <label key={key} className="slider">
            <span className="slider-head">
              <span>{s.label}</span>
              <strong>{s.show(value[key])}</strong>
            </span>
            <input
              type="range"
              min={s.min}
              max={s.max}
              step={s.step}
              value={value[key]}
              onChange={(e) => onChange({ ...value, [key]: Number(e.target.value) })}
            />
            {s.hint && <span className="slider-hint">{s.hint}</span>}
          </label>
        );
      })}
    </div>
  );
}
