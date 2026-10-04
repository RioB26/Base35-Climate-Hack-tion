import { Suspense, lazy, useEffect, useMemo, useState } from "react";
import { PageHead } from "../components/Nav";
import { SignalChart } from "../components/SignalChart";
import { regionOf, tanagerFor, useData } from "../data";
import { isSlow } from "../data/live";
import { fmtInt, fmtPpb, fmtT } from "../format";
import { compareWithSatellite, SECTOR_EFFECTIVE_WIDTH_M } from "../model/discrepancy";
import type { Assumptions, Site } from "../model/types";
import type { Route } from "../route";
import { TanagerEvidence } from "../components/TanagerEvidence";
import { Loading } from "../components/Mark";

const SiteMap = lazy(() => import("../components/SiteMap"));

export function CheckPage({ site, assumptions, go }: { site: Site; assumptions: Assumptions; go: (r: Route) => void }) {
  const { satelliteFor, gridFor, statusFor, canAdd, retrySite } = useData();
  const [retryMsg, setRetryMsg] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);
  const onRetry = async () => {
    let passcode: string | null = null;
    try {
      passcode = sessionStorage.getItem("add-site-passcode");
    } catch {
      /* storage unavailable */
    }
    if (!passcode) passcode = window.prompt("Passcode to retry this site:");
    if (!passcode) return;
    setRetrying(true);
    setRetryMsg(null);
    const res = await retrySite(site.id, passcode);
    setRetrying(false);
    if (res.ok) {
      try {
        sessionStorage.setItem("add-site-passcode", passcode);
      } catch {
        /* storage unavailable */
      }
    } else {
      setRetryMsg(res.error);
    }
  };
  const annualSat = satelliteFor(site.id);
  const status = statusFor(site.id);
  const tanager = tanagerFor(site.id);
  const timeSeriesDates = [
    ...tanager.observations.map((observation) => observation.observedAt.slice(0, 10)),
    ...(annualSat.periods ?? []).map((period) => `${period.period}-28`),
  ].sort();
  const latestObservationDate = timeSeriesDates.at(-1) ?? annualSat.windowEnd?.slice(0, 10) ?? "";
  const [selectedDate, setSelectedDate] = useState(latestObservationDate);
  useEffect(() => {
    setSelectedDate(latestObservationDate);
  }, [site.id, latestObservationDate]);
  const visibleTanager = useMemo(
    () => ({ ...tanager, observations: tanager.observations.filter((observation) => observation.observedAt.slice(0, 10) <= selectedDate) }),
    [tanager, selectedDate],
  );
  const sat = annualSat.periods?.filter((period) => period.period <= selectedDate.slice(0, 7)).at(-1) ?? annualSat;
  const c = useMemo(() => compareWithSatellite(site, sat, assumptions), [site, sat, assumptions]);
  const cap = Math.round(site.existingCapture * 100);
  const toFix = () => go({ page: "fix", siteId: site.id });

  return (
    <main className="page workspace">
      <PageHead step="Step 2 · Check" title={site.name} sub={`${regionOf(site)}. Compare the emissions baseline with the regional satellite signal.`} />
      <section className="check-overview" aria-label="Compare the baseline with the satellite signal">
        <div className="check-readings">
          <article className="card">
            <div className="card-heading">
              <h2 className="card-title">{c.reportedBasis === "reported" ? "What the site reports" : "Estimated site emissions"}</h2>
              <span className="tag">{c.reportedBasis === "reported" ? "Published figure" : site.illustrative ? "Proxy inputs" : "Model estimate"}</span>
            </div>
            <p className="big-num">
              {fmtInt(c.reportedEmissionT)} <span className="unit">t CH₄ a year escaping</span>
            </p>
            {c.reportedBasis === "reported" ? (
              <p className="muted small">Published figure for {site.reportedEmissions!.year}: {site.reportedEmissions!.source}</p>
            ) : (
              <p className="muted small">
                Modelled for {c.year}: {fmtInt(c.generationT)} t of methane generated, with {cap}% captured.
                No published emissions figure is available. {site.illustrative ? "Check the proxy inputs against operator records." : "The baseline uses sourced site inputs."}
              </p>
            )}
            <p className="small">
              At the site's wind, that would raise methane downwind by about <strong>{fmtPpb(c.expectedPpb)} ppb</strong>.
            </p>
          </article>

          <article className="card">
            <h2 className="card-title">What the satellite saw</h2>
            {c.observedPpb === null ? (
              <>
              <p className="muted">
                {status.state === "running" || status.state === "pending"
                  ? isSlow(status, now)
                    ? "This is taking longer than usual. The page updates by itself if the satellite job finishes; if it times out you can retry."
                    : "Fetching Sentinel-5P data for this site. This usually takes a few minutes; the page updates by itself."
                  : status.state === "failed"
                    ? `The satellite check failed${status.error ? `: ${status.error}` : "."}`
                    : "The satellite check has not been run for this site yet."}
              </p>
              {status.state === "failed" && canAdd && (
                <p>
                  <button type="button" className="ghost" onClick={onRetry} disabled={retrying}>
                    {retrying ? "Retrying…" : "Retry"}
                  </button>
                  {retryMsg && <span className="small"> {retryMsg}</span>}
                </p>
              )}
              </>
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
                <details className="reading-method">
                  <summary>Period and wind data</summary>
                  <p className="fine">
                    {annualSat.periods?.length
                      ? "This period uses the generated Sentinel-5P time series and timestamp-matched ERA5 wind."
                      : "Monthly Sentinel-5P periods are not in this snapshot yet, so the slider uses the annual screening result until the pipeline is refreshed."}
                  </p>
                </details>
                <SignalChart c={c} />
              </>
            )}
          </article>
        </div>
        <Verdict site={site} c={c} />
      </section>

      <div className="split check">
        <div className="col workflow-stack">
          <TanagerEvidence site={site} tanager={tanager} comparison={c} selectedDate={selectedDate} onDateChange={setSelectedDate} />

          <div className="actions">
            <button type="button" className="cta" onClick={toFix}>
              {c.verdict === "higher" ? "See what capture could fix →" : "Plan a capture project →"}
            </button>
            <a className="ghost" href="#/landfills">
              ← Back to the globe
            </a>
          </div>
          <details className="analysis-details">
            <summary>How this screening comparison works</summary>
            <p>
              How the comparison works: the methane escaping is spread by the wind ({c.windMs} m/s
              {c.windAssumed ? ", an assumption until the pipeline exports wind" : ", ERA5 average"}) across the downwind area, about{" "}
              {Math.round(SECTOR_EFFECTIVE_WIDTH_M / 1000)} km wide, and converted to parts per billion of the air column. It is a
              screening check, not a measurement: Sentinel-5P pixels are about 5.5 × 7 km and also pick up farms, wetlands, other
              landfills and gas networks.
            </p>
          </details>
        </div>

        <div className="col sticky">
          <Suspense fallback={<Loading className="map map-loading" label="Loading map…" />}>
            <SiteMap key={site.id} site={site} sat={sat} grid={gridFor(site.id)} tanager={visibleTanager} />
          </Suspense>
        </div>
      </div>
    </main>
  );
}

function Verdict({ site, c }: { site: Site; c: ReturnType<typeof compareWithSatellite> }) {
  if (c.verdict === "no_data") {
    return <article className="verdict neutral"><h2>Not enough data to compare</h2><p>More satellite passes are needed. You can still explore a capture project using the engineering model.</p></article>;
  }
  if (c.verdict === "consistent") {
    return (
      <article className="verdict ok">
        <h2>Consistent with the baseline</h2>
        <p>The satellite signal fits {site.name.split(",")[0]}&apos;s {c.reportedBasis === "reported" ? "reported emissions" : "estimated emissions"}, within the satellite&apos;s range.</p>
        <p className="small">This is a regional screening signal, not proof of the landfill&apos;s emissions.</p>
      </article>
    );
  }
  if (c.verdict === "lower") {
    return (
      <article className="verdict neutral">
        <h2>The satellite sees less than expected</h2>
        <p>Capture may be better than the baseline assumes, or our model may overestimate how much methane the site makes.</p>
      </article>
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
    <article className="verdict warn">
      <h2>The signal exceeds the baseline</h2>
      <p className="gap-num">
        +{fmtPpb(c.gapPpb!)} ppb <span>more than the baseline explains</span>
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
            baseline capture implies.
          </p>
          <p className="small">
            That would fit capture nearer {Math.round(Math.max(0, 1 - c.impliedT! / c.generationT) * 100)}% than the baseline{" "}
            {Math.round(site.existingCapture * 100)}%. A screening signal worth a closer look, not proof of a leak.
          </p>
        </>
      )}
    </article>
  );
}
