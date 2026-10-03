import type { Portfolio } from "../model/macc";
import { fmtT } from "../format";
import { useMoney } from "./currency";

type Props = {
  portfolio: Portfolio;
  totalSites: number;
  horizonYear: number;
  budget: number;
  maxBudget: number;
  budgetShare: number;
  onBudgetShare: (v: number) => void;
};

export function Headline({ portfolio, totalSites, horizonYear, budget, maxBudget, budgetShare, onBudgetShare }: Props) {
  const { currency, fmtAudM } = useMoney();
  const n = portfolio.fundedCount;
  return (
    <section className="headline">
      <p className="big" aria-live="polite">
        {n === 0 ? (
          <>Raise the budget to fund the first site.</>
        ) : (
          <>
            Funding the top {n === 1 ? "site" : `${n} sites`} abates{" "}
            <span className="num">{fmtT(portfolio.fundedAbatementToHorizon)} tCO₂-e</span> by {horizonYear} for{" "}
            <span className="num">{fmtAudM(portfolio.fundedCapexAud)}</span> capex.
          </>
        )}
      </p>
      <label className="budget">
        <span>
          Capex budget: <strong>{fmtAudM(budget)}</strong>{" "}
          <span className="muted">
            ({n} of {totalSites} sites funded, {fmtAudM(portfolio.fundedCapexAud)} used)
          </span>
        </span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={budgetShare}
          onChange={(e) => onBudgetShare(Number(e.target.value))}
          aria-valuetext={fmtAudM(budget)}
        />
        <span className="scale muted">
          <span>{currency} 0</span>
          <span>{fmtAudM(maxBudget)}</span>
        </span>
      </label>
    </section>
  );
}
