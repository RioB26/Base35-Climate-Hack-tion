import { describe, expect, it } from "vitest";
import { hrefFor, parseHash } from "./route";

describe("routes", () => {
  const ids = ["mugga-lane"];
  it("parses a site step", () => {
    expect(parseHash("#/site/mugga-lane/fix", ids)).toEqual({ page: "fix", siteId: "mugga-lane" });
  });
  it("falls back to the home page for unknown sites or paths", () => {
    expect(parseHash("#/site/nowhere/fix", ids)).toEqual({ page: "home" });
    expect(parseHash("#see", ids)).toEqual({ page: "home" });
  });
  it("routes the homepage and landfill explorer separately", () => {
    expect(parseHash("#/", ids)).toEqual({ page: "home" });
    expect(parseHash("", ids)).toEqual({ page: "home" });
    expect(parseHash(hrefFor({ page: "find" }), ids)).toEqual({ page: "find" });
    expect(hrefFor({ page: "home" })).toBe("#/");
  });
  it("parses the plan step", () => {
    expect(parseHash("#/site/mugga-lane/plan", ids)).toEqual({ page: "plan", siteId: "mugga-lane" });
  });
  it("round-trips", () => {
    expect(parseHash(hrefFor({ page: "fund", siteId: "mugga-lane" }), ids)).toEqual({ page: "fund", siteId: "mugga-lane" });
  });
});
