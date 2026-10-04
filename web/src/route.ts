import { useCallback, useEffect, useMemo, useState } from "react";

export type Step = "check" | "fix" | "fund" | "plan";
export type Route = { page: "find" } | { page: Step; siteId: string };

export const STEPS: { page: "find" | Step; label: string }[] = [
  { page: "find", label: "Find" },
  { page: "check", label: "Check" },
  { page: "fix", label: "Fix" },
  { page: "fund", label: "Fund" },
  { page: "plan", label: "Plan" },
];

/** Hash routes keep deep links working on GitHub Pages: #/site/<id>/<step>. */
export function parseHash(hash: string, knownIds: string[]): Route {
  const m = hash.match(/^#\/site\/([\w-]+)\/(check|fix|fund|plan)$/);
  if (m && knownIds.includes(m[1])) return { page: m[2] as Step, siteId: m[1] };
  return { page: "find" };
}

export const hrefFor = (r: Route) => (r.page === "find" ? "#/" : `#/site/${r.siteId}/${r.page}`);

export function useRoute(knownIds: string[]): [Route, (r: Route) => void] {
  // Keep the raw hash and resolve it against the current site list on every render, so a site that
  // arrives after the hash changes (a just-added landfill) is picked up without a stale listener.
  const [hash, setHash] = useState(() => window.location.hash);
  useEffect(() => {
    const on = () => {
      setHash(window.location.hash);
      window.scrollTo({ top: 0 });
    };
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  const route = useMemo(() => parseHash(hash, knownIds), [hash, knownIds]);
  const go = useCallback((r: Route) => {
    window.location.hash = hrefFor(r);
  }, []);
  return [route, go];
}
