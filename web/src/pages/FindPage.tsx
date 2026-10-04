import { Suspense, lazy, useMemo, useState } from "react";
import { AddSiteForm } from "../components/AddSiteForm";
import { country, regionOf, useData } from "../data";
import type { Route } from "../route";
import type { Site } from "../model/types";
import { Loading } from "../components/Mark";
import { JOURNEY } from "../data/journey";

const GlobeView = lazy(() => import("../components/GlobeView"));

const STATUS: Record<string, string> = { elevated: "Satellite: elevated", neutral: "Satellite: neutral", inconclusive: "Satellite: inconclusive", not_run: "Satellite: not run" };

function satelliteLabel(state: string, status: string): string {
  if (state === "running" || state === "pending") return "Satellite: fetching…";
  if (state === "failed") return "Satellite: failed";
  return STATUS[status];
}

export function FindPage({ sites, go }: { sites: Site[]; go: (r: Route) => void }) {
  const [query, setQuery] = useState("");
  const [target, setTarget] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const { satelliteFor, statusFor, canAdd, notice, dismissNotice } = useData();
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sites;
    return sites.filter((s) => `${s.name} ${regionOf(s)} ${s.state}`.toLowerCase().includes(q));
  }, [query, sites]);
  const byCountry = ["Australia", "New Zealand", "Fiji"]
    .map((name) => ({ name, count: sites.filter((site) => country(site) === name).length }))
    .filter(({ count }) => count > 0)
    .map(({ name, count }) => `${count} in ${name}`);

  return (
    <main className="find-page">
      {notice && (
        <div className="notice" role="alert">
          <div><strong>{notice.title}</strong><p>{notice.message}</p></div>
          <button type="button" className="notice-close" onClick={dismissNotice} aria-label="Dismiss">×</button>
        </div>
      )}
      <section className="find" aria-labelledby="find-title">
        <Suspense fallback={<Loading className="globe-wrap globe-loading" label="Loading globe…" />}>
          <GlobeView sites={sites} target={target} onPick={setTarget} onArrive={(id) => go({ page: "check", siteId: id })} />
        </Suspense>
        <div className="find-card">
          <p className="eyebrow">Step 1 · Find</p>
          <h1 id="find-title">
            Which landfills should we <em>fix first</em>?
          </h1>
          <p className="lede">
            Choose a site to screen its methane signal, explore additional gas capture and compare project costs and returns.
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
                <button type="button" className={target === s.id ? "on" : ""} aria-pressed={target === s.id} onClick={() => setTarget(s.id)}>
                  <span className="r-heading">
                    <span className="r-name">{s.name}</span>
                    {s.illustrative && <span className="tag">Proxy inputs</span>}
                  </span>
                  <span className="r-meta"><span>{regionOf(s)}</span><span className="site-status">{satelliteLabel(statusFor(s.id).state, satelliteFor(s.id).status)}</span></span>
                </button>
              </li>
            ))}
            {matches.length === 0 && <li className="muted small">No landfill matches "{query}" yet.</li>}
          </ul>
          <p className="fine">
            {sites.length} landfills so far ({listJoin(byCountry)}).
          </p>
          <p className="input-note">Proxy inputs are estimates used where site-specific model data is unavailable. Review them before planning a project.</p>
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
          onLeave={() => setAdding(false)}
          onAdded={() => {
            setAdding(false);
          }}
        />
      )}

      <section className="page how" aria-labelledby="find-how-title">
        <div className="page-head">
          <p className="eyebrow">Find · Check · Fix · Fund</p>
          <h2 id="find-how-title" className="section-title">From a site to a funding decision</h2>
          <p className="page-sub">Satellite screening helps decide where to look closer. A separate model estimates what a capture project could achieve by 2035.</p>
        </div>
        <ol className="steps">
          {JOURNEY.map(([title, text], i) => (
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
    </main>
  );
}

const listJoin = (items: string[]) => (items.length < 2 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`);
