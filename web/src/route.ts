import { useCallback, useEffect, useState } from "react";

export type Step = "check" | "fix" | "fund";
export type Route = { page: "find" } | { page: Step; siteId: string };

export const STEPS: { page: "find" | Step; label: string }[] = [
  { page: "find", label: "Find" },
  { page: "check", label: "Check" },
  { page: "fix", label: "Fix" },
  { page: "fund", label: "Fund" },
];

/** Hash routes keep deep links working on GitHub Pages: #/site/<id>/<step>. */
export function parseHash(hash: string, knownIds: string[]): Route {
  const m = hash.match(/^#\/site\/([\w-]+)\/(check|fix|fund)$/);
  if (m && knownIds.includes(m[1])) return { page: m[2] as Step, siteId: m[1] };
  return { page: "find" };
}

export const hrefFor = (r: Route) => (r.page === "find" ? "#/" : `#/site/${r.siteId}/${r.page}`);

export function useRoute(knownIds: string[]): [Route, (r: Route) => void] {
  const [route, setRoute] = useState(() => parseHash(window.location.hash, knownIds));
  useEffect(() => {
    const on = () => {
      setRoute(parseHash(window.location.hash, knownIds));
      window.scrollTo({ top: 0 });
    };
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, [knownIds]);
  const go = useCallback((r: Route) => {
    window.location.hash = hrefFor(r);
  }, []);
  return [route, go];
}
