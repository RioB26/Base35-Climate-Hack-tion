import { Suspense, lazy, useMemo } from "react";
import { PageHead } from "../components/Nav";
import { SignalChart } from "../components/SignalChart";
import { methaneGrid, regionOf, satelliteFor, tanagerFor } from "../data";
import { fmtInt, fmtPpb, fmtT } from "../format";
import { compareWithSatellite, SECTOR_EFFECTIVE_WIDTH_M } from "../model/discrepancy";
import type { Assumptions, Site } from "../model/types";
import type { Route } from "../route";
import { TanagerEvidence } from "../components/TanagerEvidence";

const SiteMap = lazy(() => import("../components/SiteMap"));

export function CheckPage({ site, assumptions, go }: { site: Site; assumptions: Assumptions; go: (r: Route) => void }) {
  const sat = satelliteFor(site.id);
  const tanager = tanagerFor(site.id);
  const c = useMemo(() => compareWithSatellite(site, sat, assumptions), [site, sat, assumptions]);
  const cap = Math.round(site.existingCapture * 100);
  const toFix = () => go({ page: "fix", siteId: site.id });

  return (
    <main className="page">
      <PageHead step="Step 2 · Check" title={site.name} sub={`${regionOf(site)}. Does the satellite agree with what the site reports?`} />
      <div className="split">
        <div className="col">
          <article className="card">
            <h2 className="card-title">What the site reports</h2>
            <p className="big-num">
              {fmtInt(c.reportedEmissionT)} <span className="unit">t CH₄ a year escaping</span>
            </p>
            {c.reportedBasis === "reported" ? (
              <p className="muted small">Published figure for {site.reportedEmissions!.year}: {site.reportedEmissions!.source}</p>
            ) : (
              <p className="muted small">
                No published emissions figure for this site, so this is our model's {c.year} methane ({fmtInt(c.generationT)} t)
                minus the {cap}% the operator says it captures.{" "}
                <span className="tag">{site.illustrative ? "proxy inputs" : "sourced"}</span>
              </p>
            )}
            <p className="small">
              At the site's wind, that would raise methane downwind by about <strong>{fmtPpb(c.expectedPpb)} ppb</strong>.
            </p>
          </article>

          <article className="card">
            <h2 className="card-title">What the satellite saw</h2>
            {c.observedPpb === null ? (
              <p className="muted">The satellite check has not been run for this site yet.</p>
            ) : (
              <>
                <p className="big-num">
                  {c.observedPpb > 0 ? "+" : ""}
                  {c.observedPpb.toFixed(1)} <span className="unit">ppb downwind vs upwind</span>
                </p>
                <p className="muted small">
                  95% range {c.observedCi![0].toFixed(1)} to {c.observedCi![1].toFixed(1)} ppb, from {sat.overpassesUsed}{" "}
                  Sentinel-5P passes, {sat.windowStart?.slice(0, 7)} to {sat.windowEnd?.slice(0, 7)}.
                </p>
                <SignalChart c={c} />
              </>
            )}
          </article>

          <Verdict site={site} c={c} />
          <TanagerEvidence site={site} tanager={tanager} comparison={c} />

          <div className="actions">
            <button type="button" className="cta" onClick={toFix}>
              {c.verdict === "higher" ? "See what capture could fix →" : "Plan a capture project →"}
            </button>
            <a className="ghost" href="#/">
              ← Back to the globe
            </a>
          </div>
          <p className="fine">
            How the comparison works: the methane escaping is spread by the wind ({c.windMs} m/s
            {c.windAssumed ? ", an assumption until the pipeline exports wind" : ", ERA5 average"}) across the downwind area, about{" "}
            {Math.round(SECTOR_EFFECTIVE_WIDTH_M / 1000)} km wide, and converted to parts per billion of the air column. It is a
            screening check, not a measurement: Sentinel-5P pixels are about 5.5 × 7 km and also pick up farms, wetlands, other
            landfills and gas networks.
          </p>
        </div>

        <div className="col sticky">
          <Suspense fallback={<div className="map map-loading">Loading map…</div>}>
            <SiteMap key={site.id} site={site} sat={sat} grid={methaneGrid[site.id]} tanager={tanager} />
          </Suspense>
        </div>
      </div>
    </main>
  );
}

function Verdict({ site, c }: { site: Site; c: ReturnType<typeof compareWithSatellite> }) {
  if (c.verdict === "no_data") {
    return <p className="verdict neutral">Not enough satellite passes to compare yet. The capture plan still works without it.</p>;
  }
  if (c.verdict === "consistent") {
    return (
      <div className="verdict ok">
        <strong>Consistent.</strong> The satellite signal fits what {site.name.split(",")[0]} reports, within the satellite's
        range.
      </div>
    );
  }
  if (c.verdict === "lower") {
    return (
      <div className="verdict neutral">
        <strong>The satellite sees less than expected.</strong> Capture may be better than reported, or our model overestimates
        how much methane the site makes.
      </div>
    );
  }
  const ratio = c.impliedT! / Math.max(1, c.reportedEmissionT);
  const implied = (
    <>
      If the landfill were the only source, the signal would mean about <strong>{fmtT(c.impliedT!)} t CH₄ a year</strong> (range{" "}
      {fmtT(c.impliedTRange![0])} to {fmtT(c.impliedTRange![1])})
    </>
  );
  return (
    <div className="verdict warn">
      <p className="gap-num">
        +{fmtPpb(c.gapPpb!)} ppb <span>more than the reported figures explain</span>
      </p>
      {c.exceedsGeneration ? (
        <>
          <p>
            {implied}. That is more than the landfill makes in total ({fmtInt(c.generationT)} t a year, even with no capture).
          </p>
          <p className="small">
            So most of the signal must come from other sources nearby (farms, wetlands, gas networks) or a satellite artefact near
            the coast. A screening signal worth a closer look, not proof of a leak.
          </p>
        </>
      ) : (
        <>
          <p>
            {implied}, {ratio >= 10 ? `${Math.round(ratio)}×` : `${ratio.toFixed(1)}×`} the {fmtInt(c.reportedEmissionT)} t the
            reported capture implies.
          </p>
          <p className="small">
            That would fit capture nearer {Math.round(Math.max(0, 1 - c.impliedT! / c.generationT) * 100)}% than the reported{" "}
            {Math.round(site.existingCapture * 100)}%. A screening signal worth a closer look, not proof of a leak.
          </p>
        </>
      )}
    </div>
  );
}
