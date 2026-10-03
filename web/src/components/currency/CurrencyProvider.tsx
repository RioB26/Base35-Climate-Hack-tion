import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { isCurrency, type Currency } from "./currencies";
import { createMoneyFormatter } from "./format";
import { baseRates, fetchRates, type Rates } from "./rates";

const STORAGE_KEY = "methane-currency";
const RATE_TIMEOUT_MS = 10_000;

type CurrencyState = {
  currency: Currency;
  select: (code: Currency) => void;
  rates: Rates;
  loading: boolean;
  error: boolean;
  retry: () => void;
  anchor: HTMLDivElement | null;
  setAnchor: (anchor: HTMLDivElement | null) => void;
};

const CurrencyContext = createContext<CurrencyState | null>(null);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrency] = useState<Currency>("AUD");
  const [rates, setRates] = useState<Rates>(baseRates);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [anchor, setAnchor] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    let disposed = false;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), RATE_TIMEOUT_MS);
    setLoading(true);
    setError(false);

    fetchRates(controller.signal)
      .then((next) => {
        if (disposed) return;
        setRates(next);
        try {
          const saved = localStorage.getItem(STORAGE_KEY);
          if (isCurrency(saved)) setCurrency(saved);
        } catch {
          // Storage may be disabled; currency selection still works.
        }
      })
      .catch(() => {
        if (!disposed) setError(true);
      })
      .finally(() => {
        window.clearTimeout(timeout);
        if (!disposed) setLoading(false);
      });

    return () => {
      disposed = true;
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [attempt]);

  const select = (code: Currency) => {
    if (!rates[code]) return;
    setCurrency(code);
    try {
      localStorage.setItem(STORAGE_KEY, code);
    } catch {
      // Saving the preference is optional.
    }
  };

  return (
    <CurrencyContext.Provider
      value={{ currency, select, rates, loading, error, retry: () => setAttempt((n) => n + 1), anchor, setAnchor }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) throw new Error("Currency controls require CurrencyProvider");
  return context;
}

export function useMoney() {
  const { currency, rates } = useCurrency();
  return createMoneyFormatter(currency, rates[currency]?.rate ?? 1);
}

/** Register the map's currency slot without observing unrelated DOM changes. */
export function CurrencyAnchor() {
  const { setAnchor } = useCurrency();
  return <div ref={setAnchor} className="currency-map-anchor" />;
}
