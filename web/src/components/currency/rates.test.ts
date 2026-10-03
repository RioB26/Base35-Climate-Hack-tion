import { describe, expect, it } from "vitest";
import { currencies } from "./currencies";
import { parseRates } from "./rates";

const rows = currencies.filter(({ code }) => code !== "AUD").map(({ code }) => ({
  base: "AUD", quote: code, rate: 1.25, date: "2026-10-03",
}));

describe("reference rate validation", () => {
  it("accepts complete rates and keeps AUD at one", () => {
    expect(parseRates(rows).AUD?.rate).toBe(1);
    expect(parseRates(rows).NZD).toEqual({ rate: 1.25, date: "2026-10-03" });
  });
  it("rejects missing, invalid, or incorrectly based rates", () => {
    expect(() => parseRates(null)).toThrow("Invalid rates");
    expect(() => parseRates(rows.slice(1))).toThrow("Incomplete rates");
    for (const rate of [0, -1, Infinity, "1.25"]) {
      expect(() => parseRates([{ ...rows[0], rate }, ...rows.slice(1)])).toThrow("Incomplete rates");
    }
    expect(() => parseRates(rows.map((row) => ({ ...row, base: "USD" })))).toThrow("Incomplete rates");
  });
  it("ignores malformed and unsupported entries without replacing the AUD base", () => {
    const extra = [null, "invalid", { ...rows[0], quote: "ABC" }, { ...rows[0], quote: "AUD", rate: 2 }];
    expect(parseRates([...rows, ...extra]).AUD?.rate).toBe(1);
  });
});
