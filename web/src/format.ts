export const fmtInt = (n: number) => Math.round(n).toLocaleString("en-AU");

/** Two significant figures, e.g. 2,100,000 -> "2.1M". */
export const fmtAudM = (n: number) => `AUD ${(n / 1e6).toPrecision(2)}M`;

export const fmtT = (n: number) => {
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e4) return `${Math.round(n / 1e3).toLocaleString("en-AU")}k`;
  return fmtInt(n);
};

export const fmtCostPerT = (n: number) =>
  Number.isFinite(n) ? `${n < 0 ? "−" : ""}AUD ${Math.abs(n).toFixed(n > -10 && n < 10 ? 1 : 0)}` : "n/a";

export const shortName = (name: string) => name.split(":")[0];
