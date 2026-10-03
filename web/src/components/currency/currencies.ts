export const currencies = [
  { code: "AUD", name: "Australian dollar" },
  { code: "NZD", name: "New Zealand dollar" },
  { code: "USD", name: "US dollar" },
  { code: "EUR", name: "Euro" },
  { code: "GBP", name: "Pound sterling" },
  { code: "CAD", name: "Canadian dollar" },
  { code: "CHF", name: "Swiss franc" },
  { code: "JPY", name: "Japanese yen" },
] as const;
export type Currency = (typeof currencies)[number]["code"];

export function isCurrency(value: unknown): value is Currency {
  return currencies.some((currency) => currency.code === value);
}
