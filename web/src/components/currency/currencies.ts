export const currencies = [
  { code: "AUD", name: "Australian dollar" },
  { code: "NZD", name: "New Zealand dollar" },
  { code: "FJD", name: "Fijian dollar" },
  { code: "PGK", name: "Papua New Guinean kina" },
  { code: "SBD", name: "Solomon Islands dollar" },
  { code: "VUV", name: "Vanuatu vatu" },
  { code: "WST", name: "Samoan tala" },
  { code: "TOP", name: "Tongan paʻanga" },
  { code: "XPF", name: "CFP franc" },
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
