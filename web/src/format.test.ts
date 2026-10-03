import { expect, it } from "vitest";
import { fmtAudM } from "./format";

it("formats AUD millions without exponent notation", () => {
  expect(fmtAudM(2_100_000)).toBe("AUD 2.1M");
  expect(fmtAudM(78_400_000)).toBe("AUD 78M");
  expect(fmtAudM(1_120_000_000)).toBe("AUD 1,120M");
});
