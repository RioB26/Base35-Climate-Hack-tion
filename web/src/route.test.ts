import { describe, expect, it } from "vitest";
import { hrefFor, parseHash } from "./route";

describe("routes", () => {
  const ids = ["mugga-lane"];
  it("parses a site step", () => {
    expect(parseHash("#/site/mugga-lane/fix", ids)).toEqual({ page: "fix", siteId: "mugga-lane" });
  });
  it("falls back to the globe for unknown sites or paths", () => {
    expect(parseHash("#/site/nowhere/fix", ids)).toEqual({ page: "find" });
    expect(parseHash("#see", ids)).toEqual({ page: "find" });
  });
  it("parses the plan step", () => {
    expect(parseHash("#/site/mugga-lane/plan", ids)).toEqual({ page: "plan", siteId: "mugga-lane" });
  });
  it("round-trips", () => {
    expect(parseHash(hrefFor({ page: "fund", siteId: "mugga-lane" }), ids)).toEqual({ page: "fund", siteId: "mugga-lane" });
  });
});
