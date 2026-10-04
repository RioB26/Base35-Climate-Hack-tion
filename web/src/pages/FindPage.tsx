import { Suspense, lazy, useMemo, useState } from "react";
import { AddSiteForm } from "../components/AddSiteForm";
import { country, regionOf, useData } from "../data";
import type { Route } from "../route";
import type { Site } from "../model/types";
import { Loading } from "../components/Mark";

const GlobeView = lazy(() => import("../components/GlobeView"));

const STATUS: Record<string, string> = { elevated: "Satellite: elevated", neutral: "Satellite: neutral", inconclusive: "Satellite: inconclusive", not_run: "Satellite: not run" };

function satelliteLabel(state: string, status: string): string {
  if (state === "running" || state === "pending") return "Satellite: fetching…";
  if (state === "failed") return "Satellite: failed";
  return STATUS[status];
}

const HOW = [
  ["Find", "Pick a landfill on the globe or search for it."],
  ["Check", "Compare what the site reports with what the Sentinel-5P satellite sees downwind."],
  ["Fix", "Set up a capture project: target capture, start year, power price, costs."],
  ["Fund", "See the budget, the electricity and money it makes, and a COP31 alignment check."],
];

export function FindPage({ sites, go }: { sites: Site[]; go: (r: Route) => void }) {
  const [query, setQuery] = useState("");
  const [target, setTarget] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const { satelliteFor, statusFor, canAdd } = useData();
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sites;
    return sites.filter((s) => `${s.name} ${regionOf(s)} ${s.state}`.toLowerCase().includes(q));
  }, [query, sites]);
  const byCountry = ["Australia", "New Zealand", "Fiji"]
    .map((c) => ({ c, n: sites.filter((s) => country(s) === c).length }))
    .filter((x) => x.n > 0)
    .map((x) => `${x.n} in ${x.c}`);

  return (
    <>
      <section className="find">
        <Suspense fallback={<Loading className="globe-wrap globe-loading" label="Loading globe…" />}>
          <GlobeView sites={sites} target={target} onPick={setTarget} onArrive={(id) => go({ page: "check", siteId: id })} />
        </Suspense>
        <div className="find-card">
          <p className="eyebrow">Climate Hack-tion 2026 · Zero waste and methane · Build for 2035</p>
          <h1>
            Which landfills should we <em>fix first</em>?
          </h1>
          <p className="lede">
            Pick a landfill to check its methane, plan a capture project and see what it would cost and earn.
          </p>
          <form
            className="search"
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              if (matches[0]) setTarget(matches[0].id);
            }}
          >
            <input
              type="search"
              placeholder="Search landfills, cities or regions"
              aria-label="Search landfills"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </form>
          <ul className="results" aria-live="polite">
            {matches.map((s) => (
              <li key={s.id}>
                <button type="button" className={target === s.id ? "on" : ""} onClick={() => setTarget(s.id)}>
                  <span className="r-name">{s.name}</span>
                  <span className="r-meta">
                    {regionOf(s)} · {satelliteLabel(statusFor(s.id).state, satelliteFor(s.id).status)}
                    {s.illustrative && (
                      <>
                        {" "}
                        <span className="tag">proxy inputs</span>
                      </>
                    )}
                  </span>
                </button>
              </li>
            ))}
            {matches.length === 0 && <li className="muted small">No landfill matches "{query}" yet.</li>}
          </ul>
          <p className="fine">
            {sites.length} landfills so far ({listJoin(byCountry)}).
          </p>
          {canAdd && (
            <button type="button" className="ghost" onClick={() => setAdding(true)}>
              Add a landfill
            </button>
          )}
        </div>
      </section>

      {adding && (
        <AddSiteForm
          onClose={() => setAdding(false)}
          onAdded={(id) => {
            setAdding(false);
            go({ page: "check", siteId: id });
          }}
        />
      )}

      <section className="page how">
        <ol className="steps">
          {HOW.map(([title, text], i) => (
            <li key={title}>
              <span className="step-num">{i + 1}</span>
              <span className="step-title">{title}</span>
              <span className="step-text">{text}</span>
            </li>
          ))}
        </ol>
        <div className="gap">
          <div>
            <h3>What already exists</h3>
            <p>Satellite detection and alerts (GHGSat, Carbon Mapper, UNEP MARS) and US single-site cost tools (EPA LFGcost-Web).</p>
          </div>
          <div>
            <h3>What we add</h3>
            <p>
              An open decision layer for Australia and New Zealand: local prices and carbon credits, transparent assumptions,
              and a ranking of what to fund first.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}

const listJoin = (xs: string[]) => (xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);
