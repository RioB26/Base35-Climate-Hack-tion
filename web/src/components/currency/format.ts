import type { Currency } from "./currencies";

export function createMoneyFormatter(currency: Currency, rate: number) {
  const convert = (aud: number) => aud * rate;
  const numberFormat = new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency,
    currencyDisplay: "code",
  });
  const minorUnits = numberFormat.resolvedOptions().maximumFractionDigits ?? 2;
  const fmtMoney = (aud: number) => numberFormat.format(convert(aud));
  const fmtAudM = (aud: number) => {
    const n = convert(aud);
    const millions = Math.abs(n) >= 1e8
      ? Math.round(n / 1e6).toLocaleString("en-AU")
      : Number((n / 1e6).toPrecision(2));
    return `${currency} ${millions}M`;
  };
  const fmtCostPerT = (aud: number) => {
    const n = convert(aud);
    if (!Number.isFinite(n)) return "n/a";
    const decimals = minorUnits > 0 && Math.abs(n) < 10 ? 1 : 0;
    return `${n < 0 ? "−" : ""}${currency} ${Math.abs(n).toFixed(decimals)}`;
  };
  return { currency, convert, fmtMoney, fmtAudM, fmtCostPerT };
}
