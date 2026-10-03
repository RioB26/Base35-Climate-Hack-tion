import { currencies, isCurrency, type Currency } from "./currencies";

export type Rate = { rate: number; date: string };
export type Rates = Partial<Record<Currency, Rate>>;
export const baseRates: Rates = { AUD: { rate: 1, date: "" } };
const quotes = currencies.filter(({ code }) => code !== "AUD").map(({ code }) => code).join(",");
const RATES_URL = `https://api.frankfurter.dev/v2/rates?base=AUD&quotes=${quotes}`;

/** Accept only complete, dated reference rates for the supported currencies. */
export function parseRates(rows: unknown): Rates {
  if (!Array.isArray(rows)) throw new Error("Invalid rates");
  const rates: Rates = { ...baseRates };

  for (const row of rows) {
    if (typeof row !== "object" || row === null) continue;
    const { base, quote, rate, date } = row as Record<string, unknown>;
    if (
      base === "AUD" && isCurrency(quote) && quote !== "AUD" &&
      typeof rate === "number" && Number.isFinite(rate) && rate > 0 &&
      typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)
    ) {
      rates[quote] = { rate, date };
    }
  }

  if (Object.keys(rates).length !== currencies.length) throw new Error("Incomplete rates");
  return rates;
}

export async function fetchRates(signal: AbortSignal): Promise<Rates> {
  const response = await fetch(RATES_URL, { signal });
  if (!response.ok) throw new Error("Rates unavailable");
  const rows: unknown = await response.json();
  return parseRates(rows);
}
