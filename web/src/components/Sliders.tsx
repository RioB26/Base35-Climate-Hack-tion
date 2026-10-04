import { useMoney } from "./currency";
import { Info } from "./Info";
import type { Assumptions } from "../model/types";

type NumKey = { [K in keyof Assumptions]: Assumptions[K] extends number ? K : never }[keyof Assumptions];

type Spec = { label: string; min: number; max: number; step: number; show: (v: number) => string; hint?: string };

const pct = (v: number) => `${Math.round(v * 100)}%`;

const SPECS: Partial<Record<NumKey, Spec>> = {
  captureEfficiency: { label: "Target capture", min: 0.5, max: 0.98, step: 0.01, show: pct, hint: "Share of methane collected after commissioning. Higher capture avoids more emissions." },
  commissioningYear: { label: "Commissioning year", min: 2026, max: 2032, step: 1, show: String, hint: "First year of operation. Starting sooner avoids more emissions by 2035." },
  engineEfficiency: { label: "Engine efficiency", min: 0.3, max: 0.45, step: 0.01, show: pct, hint: "Gas energy converted to electricity. Higher efficiency increases power sales." },
  powerPriceAudPerMWh: { label: "Power price", min: 30, max: 200, step: 5, show: (v) => `AUD ${v}/MWh`, hint: "NEM default: AEMO Q2 2026. Higher electricity prices reduce net cost per tonne." },
  capexMultiplier: { label: "Capex multiplier", min: 0.5, max: 2, step: 0.05, show: (v) => `× ${v.toFixed(2)}`, hint: "× 1 uses the US EPA build-cost benchmark, converted to AUD. Increase for a more expensive project." },
  discountRate: { label: "Discount rate", min: 0.03, max: 0.12, step: 0.005, show: (v) => `${(v * 100).toFixed(1)}%`, hint: "Annual rate used to discount future costs and benefits. Higher rates give more weight to upfront costs." },
  projectLifeYears: { label: "Project life", min: 10, max: 25, step: 1, show: (v) => `${v} years`, hint: "Years of operation. Longer projects spread build costs over more captured methane." },
  accuPriceAud: { label: "ACCU price", min: 0, max: 80, step: 1, show: (v) => `AUD ${v}`, hint: "Revenue per eligible tonne of CO₂-e. Credits affect payback, not the site ranking." },
};

type Props = { keys: NumKey[]; value: Assumptions; onChange: (a: Assumptions) => void };

/** A group of sliders for one stage of the analysis. */
export function SliderGroup({ keys, value, onChange }: Props) {
  const { fmtMoney } = useMoney();
  const display = (key: NumKey, amount = value[key]) => {
    if (key === "powerPriceAudPerMWh") return `${fmtMoney(amount)}/MWh`;
    if (key === "accuPriceAud") return fmtMoney(amount);
    return SPECS[key]!.show(amount);
  };
  return (
    <div className="sliders">
      {keys.map((key) => {
        const s = SPECS[key]!;
        return (
          <label key={key} className="slider">
            <span className="slider-head">
              <span>
                {s.label}
                {s.hint && <Info label={`About ${s.label.toLowerCase()}`}>{s.hint}</Info>}
              </span>
              <strong>{display(key)}</strong>
            </span>
            <input
              type="range"
              min={s.min}
              max={s.max}
              step={s.step}
              value={value[key]}
              aria-valuetext={display(key)}
              onChange={(e) => onChange({ ...value, [key]: Number(e.target.value) })}
            />
            <span className="slider-range" aria-hidden="true"><span>{display(key, s.min)}</span><span>{display(key, s.max)}</span></span>
          </label>
        );
      })}
    </div>
  );
}
