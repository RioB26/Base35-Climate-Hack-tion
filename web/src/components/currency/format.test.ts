import { describe, expect, it } from "vitest";
import { createMoneyFormatter } from "./format";

describe("display currency conversion", () => {
  it("converts AUD amounts rather than just replacing the currency label", () => {
    const money = createMoneyFormatter("NZD", 1.25);
    expect(money.convert(80)).toBe(100);
    expect(money.fmtMoney(80)).toMatch(/NZD\s100\.00/);
    expect(money.fmtAudM(2_000_000)).toBe("NZD 2.5M");
    expect(money.fmtCostPerT(-20)).toBe("−NZD 25");
  });
  it("uses whole yen and preserves unavailable results", () => {
    const money = createMoneyFormatter("JPY", 100);
    expect(money.fmtMoney(0.012)).toMatch(/JPY\s1$/);
    expect(money.fmtCostPerT(0.012)).toBe("JPY 1");
    expect(money.fmtCostPerT(Infinity)).toBe("n/a");
  });
  it("preserves AUD base values and formats large converted budgets without exponent notation", () => {
    expect(createMoneyFormatter("AUD", 1).fmtAudM(2_100_000)).toBe("AUD 2.1M");
    expect(createMoneyFormatter("USD", 0.5).fmtAudM(2_240_000_000)).toBe("USD 1,120M");
  });
});
