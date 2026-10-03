import { useMemo, useState } from "react";
import { CurrencyProvider, CurrencySelector } from "./components/currency";
import { Nav } from "./components/Nav";
import { useData } from "./data";
import { defaultAssumptions } from "./data/assumptions";
import { buildPortfolio } from "./model/macc";
import { computeSite } from "./model/project";
import type { Assumptions } from "./model/types";
import { CheckPage } from "./pages/CheckPage";
import { FindPage } from "./pages/FindPage";
import { FixPage } from "./pages/FixPage";
import { FundPage } from "./pages/FundPage";
import { useRoute } from "./route";

export default function App() {
  const { sites } = useData();
  const ids = useMemo(() => sites.map((s) => s.id), [sites]);
  const [route, go] = useRoute(ids);
  const [assumptions, setAssumptions] = useState<Assumptions>(defaultAssumptions);
  const [budgetShare, setBudgetShare] = useState(0.6);

  const results = useMemo(() => sites.map((s) => computeSite(s, assumptions)), [sites, assumptions]);
  const maxBudget = useMemo(
    () => results.filter((r) => Number.isFinite(r.netCostAudPerTCO2e)).reduce((s, r) => s + r.capexMidAud, 0),
    [results],
  );
  const budget = budgetShare * maxBudget;
  const portfolio = useMemo(() => buildPortfolio(results, budget), [results, budget]);

  const site = route.page === "find" ? null : sites.find((s) => s.id === route.siteId) ?? null;
  const result = site ? results.find((r) => r.siteId === site.id)! : null;

  return (
    <CurrencyProvider>
      <Nav route={route} site={site} />
      {route.page === "find" && <FindPage sites={sites} go={go} />}
      {route.page === "check" && site && <CheckPage site={site} assumptions={assumptions} go={go} />}
      {route.page === "fix" && site && result && (
        <FixPage site={site} result={result} assumptions={assumptions} setAssumptions={setAssumptions} go={go} />
      )}
      {route.page === "fund" && site && result && (
        <FundPage
          site={site}
          sites={sites}
          result={result}
          results={results}
          assumptions={assumptions}
          portfolio={portfolio}
          budget={budget}
          maxBudget={maxBudget}
          budgetShare={budgetShare}
          setBudgetShare={setBudgetShare}
          go={go}
        />
      )}
      <CurrencySelector />
    </CurrencyProvider>
  );
}
