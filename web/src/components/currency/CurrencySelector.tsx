import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { currencies, type Currency } from "./currencies";
import { useCurrency } from "./CurrencyProvider";
import "./currency.css";

export function CurrencySelector() {
  const { currency, select, rates, loading, error, retry, anchor } = useCurrency();
  const currencyName = currencies.find((item) => item.code === currency)!.name
    .replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        trigger.current?.focus();
      }
    };

    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    root.current?.querySelector<HTMLButtonElement>('[aria-pressed="true"]')?.focus();

    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open, anchor]);

  const chooseCurrency = (code: Currency) => {
    select(code);
    setOpen(false);
    trigger.current?.focus();
  };
  const rateDate = rates[currency]?.date || rates.NZD?.date;
  const rateStatus = loading
    ? "Loading daily reference rates…"
    : error
      ? "Rates unavailable. AUD is available; try again for other currencies."
      : `Daily reference rates · ${rateDate}. Conversion is for display; project assumptions remain in AUD.`;

  const widget = (
    <div
      className={`currency-widget${anchor ? " currency-on-map" : ""}`}
      ref={root}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      {open && (
        <section id="currency-panel" className="currency-panel" aria-labelledby="currency-title">
          <h2 id="currency-title">Display currency</h2>
          <p className="currency-intro">Choose how project costs are displayed.</p>
          <div className="currency-options">
            {currencies.map(({ code, name }) => (
              <button
                key={code}
                type="button"
                aria-pressed={currency === code}
                disabled={!rates[code]}
                onClick={() => chooseCurrency(code)}
              >
                <span className="currency-code">{code}</span>
                <span>{name}</span>
                <span className="currency-check" aria-hidden="true">{currency === code ? "✓" : ""}</span>
              </button>
            ))}
          </div>
          <p className="currency-note" role="status">{rateStatus}</p>
          {error && <button className="currency-retry" type="button" onClick={retry}>Retry rates</button>}
          <a className="currency-source" href="https://frankfurter.dev/" target="_blank" rel="noreferrer">
            Exchange rates: Frankfurter ↗
          </a>
        </section>
      )}
      <button
        type="button"
        ref={trigger}
        className="currency-trigger"
        aria-label={`Display currency: ${currency}, ${currencyName}`}
        title={`Currencies · ${currencyName}`}
        aria-expanded={open}
        aria-controls="currency-panel"
        onClick={() => setOpen(!open)}
      >
        <strong>{currency}</strong>
        <span className="currency-divider" aria-hidden="true">|</span>
        <span>{currencyName}</span>
      </button>
    </div>
  );

  return anchor ? createPortal(widget, anchor) : widget;
}
