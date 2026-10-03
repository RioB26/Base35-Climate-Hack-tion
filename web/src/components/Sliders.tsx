import { useMoney } from "./currency";
import type { Assumptions } from "../model/types";

type NumKey = { [K in keyof Assumptions]: Assumptions[K] extends number ? K : never }[keyof Assumptions];

type Spec = { label: string; min: number; max: number; step: number; show: (v: number) => string; hint?: string };

const pct = (v: number) => `${Math.round(v * 100)}%`;

const SPECS: Partial<Record<NumKey, Spec>> = {
  captureEfficiency: { label: "Target capture", min: 0.5, max: 0.98, step: 0.01, show: pct, hint: "Share of the site's methane collected once the project is built. Higher means more tonnes avoided at each site." },
  commissioningYear: { label: "Commissioning year", min: 2026, max: 2032, step: 1, show: String, hint: "Year the project starts running. Later means fewer tonnes avoided by 2035." },
  engineEfficiency: { label: "Engine efficiency", min: 0.3, max: 0.45, step: 0.01, show: pct, hint: "Share of the gas's energy the engines turn into electricity. Higher means more power to sell and a lower cost per tonne." },
  powerPriceAudPerMWh: { label: "Power price", min: 30, max: 200, step: 5, show: (v) => `AUD ${v}/MWh`, hint: "What the electricity sells for, per megawatt-hour. Default is the NEM average (AEMO, Q2 2026). Higher lowers the cost per tonne." },
  capexMultiplier: { label: "Capex multiplier", min: 0.5, max: 2, step: 0.05, show: (v) => `× ${v.toFixed(2)}`, hint: "Scales all build costs; × 1 is the US EPA benchmark in AUD. Higher raises the cost per tonne and fits fewer sites in the budget." },
  discountRate: { label: "Discount rate", min: 0.03, max: 0.12, step: 0.005, show: (v) => `${(v * 100).toFixed(1)}%`, hint: "How much less future money and tonnes count than today's, per year. Higher makes the upfront cost weigh more and raises the cost per tonne." },
  projectLifeYears: { label: "Project life", min: 10, max: 25, step: 1, show: (v) => `${v} years`, hint: "How long the plant runs and earns. Longer spreads the build cost over more tonnes and lowers the cost per tonne." },
  accuPriceAud: { label: "ACCU price", min: 0, max: 80, step: 1, show: (v) => `AUD ${v}`, hint: "Price of one Australian carbon credit (one tonne of CO₂-e). It doesn't change the ranking: it sets the reference line in the chart, and adds revenue when the box below is ticked." },
};

type Props = { keys: NumKey[]; value: Assumptions; onChange: (a: Assumptions) => void };

/** A group of sliders for one stage of the analysis. */
export function SliderGroup({ keys, value, onChange }: Props) {
  const { fmtMoney } = useMoney();
  const display = (key: NumKey) => {
    if (key === "powerPriceAudPerMWh") return `${fmtMoney(value[key])}/MWh`;
    if (key === "accuPriceAud") return fmtMoney(value[key]);
    return SPECS[key]!.show(value[key]);
  };
  return (
    <div className="sliders">
      {keys.map((key) => {
        const s = SPECS[key]!;
        return (
          <label key={key} className="slider">
            <span className="slider-head">
              <span>{s.label}</span>
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
            {s.hint && <span className="slider-hint">{s.hint}</span>}
          </label>
        );
      })}
    </div>
  );
}
