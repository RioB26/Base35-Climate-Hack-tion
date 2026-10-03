import type { Site } from "../model/types";
import type { TanagerSite } from "../data";
import type { Comparison } from "../model/discrepancy";

type Props = { site: Site; tanager: TanagerSite; comparison: Comparison };

export function TanagerEvidence({ site, tanager, comparison }: Props) {
  if (tanager.status === "not_checked") {
    return (
      <article className="card high-res-status">
        <div className="status-kicker"><span className="status-dot" /> High-resolution layer</div>
        <h2 className="card-title">Tanager coverage not checked</h2>
        <p className="muted small">
          Carbon Mapper&apos;s catalog has not been searched for {site.name.split(",")[0]} yet, so there is no high-resolution
          evidence either way. The map shows Sentinel-5P regional context only.
        </p>
      </article>
    );
  }

  if (tanager.status === "no_public_coverage") {
    return (
      <article className="card high-res-status">
        <div className="status-kicker"><span className="status-dot" /> High-resolution layer</div>
        <h2 className="card-title">Coverage required for facility-level evidence</h2>
        <p className="big-num">
          No Tanager pass <span className="unit">within {tanager.coverageRadiusKm} km</span>
        </p>
        <p className="muted small">
          Carbon Mapper&apos;s catalog was checked on {tanager.catalogCheckedAt}. This is unavailable coverage, not evidence
          that {site.name.split(",")[0]} has no methane.
        </p>
        <div className="high-res-options">
          <span><strong>Next capture</strong><small>GHGSat tasking or Carbon Mapper request</small></span>
          <span><strong>Current map</strong><small>Sentinel-5P regional context only</small></span>
          <span><strong>Resolution target</strong><small>~30 m facility-scale observation</small></span>
        </div>
        <p className="fine">The large cells on the map are not high-resolution plume data and have not been resized to imply precision.</p>
      </article>
    );
  }

  const distances = tanager.observations.map((observation) => ({
    ...observation,
    distanceKm: distanceKm(site.lat, site.lon, observation.lat, observation.lon),
  }));
  const bands = [
    { label: "0–1 km", max: 1 },
    { label: "1–2 km", max: 2 },
    { label: "2–5 km", max: 5 },
    { label: "5+ km", max: Infinity },
  ];
  const bandCounts = bands.map((band, index) => {
    const min = index === 0 ? 0 : bands[index - 1].max;
    return { ...band, count: distances.filter((d) => d.distanceKm >= min && d.distanceKm < band.max).length };
  });
  const maxBandCount = Math.max(...bandCounts.map((band) => band.count), 1);
  const rates = distances.map((d) => d.emissionKgPerHour).filter((rate): rate is number => rate !== null);
  const nearest = Math.min(...distances.map((d) => d.distanceKm));
  const regionalCorroboration =
    comparison.observedPpb !== null &&
    comparison.observedCi !== null &&
    comparison.observedCi[0] > 0 &&
    comparison.verdict === "higher";
  const repeatObservations = new Set(tanager.observations.map((observation) => observation.observedAt.slice(0, 10))).size > 1;
  const availableEvidence = [true, regionalCorroboration, repeatObservations].filter(Boolean).length;
  const totalEvidenceChecks = 5;

  return (
    <article className="card">
      <div className="status-kicker observed-kicker"><span className="status-dot" /> Verified high-resolution evidence</div>
      <h2 className="card-title">Tanager plume evidence</h2>
      <p className="big-num">
        {tanager.plumeCount} <span className="unit">catalogued CH₄ plumes · {tanager.sourceCount} source clusters</span>
      </p>
      <p className="muted small">
        Carbon Mapper public catalog · {tanager.observations.length} verified plume records shown · checked {tanager.catalogCheckedAt}.
      </p>
      <p className="small">
        This panel only shows facility-scale detail where a real Tanager observation exists. The map points are catalogue source
        coordinates, not reconstructed plume polygons.
      </p>
      <div className="evidence-stack">
        <div className="evidence-stack-head">
          <span className="status-kicker">Evidence stack</span>
          <span className="muted small">screen → confirm → attribute</span>
        </div>
        <EvidenceLayer
          label="Regional screening"
          source="Sentinel-5P / TROPOMI"
          status="available"
          detail="Multi-pass downwind-versus-upwind methane anomaly."
        />
        <EvidenceLayer
          label="Facility-scale confirmation"
          source="Carbon Mapper / Tanager"
          status="available"
          detail="High-resolution catalogue source point and reported rate."
        />
        <EvidenceLayer
          label="Site context"
          source="Sentinel-2"
          status="required"
          detail="Landfill boundary, gas infrastructure and nearby land-use context."
        />
        <EvidenceLayer
          label="Plume attribution"
          source="GHGSat or Tanager geometry"
          status="required"
          detail="Plume footprint, origin, timestamp wind and repeat observations."
        />
      </div>
      <div className="attribution-panel">
        <div className="attribution-head">
          <span className="status-kicker">Attribution assessment</span>
          <strong>Unresolved · {availableEvidence}/{totalEvidenceChecks} checks</strong>
        </div>
        <div className="evidence-meter" aria-label={`${availableEvidence} of ${totalEvidenceChecks} attribution checks available`}>
          <span style={{ width: `${(availableEvidence / totalEvidenceChecks) * 100}%` }} />
        </div>
        <p className="muted small">
          The evidence is close enough to investigate, but proximity alone cannot identify the landfill as the source.
        </p>
        <ul className="evidence-checks">
          <li className="evidence-check pass">
            <span aria-hidden="true">+</span>
            <span><strong>Nearby source point</strong><small>Nearest catalogue point is {nearest.toFixed(1)} km from the registered landfill coordinate.</small></span>
          </li>
          <li className={`evidence-check ${regionalCorroboration ? "pass" : "pending"}`}>
            <span aria-hidden="true">{regionalCorroboration ? "+" : "?"}</span>
            <span><strong>Regional downwind corroboration</strong><small>
              {regionalCorroboration
                ? `Sentinel-5P shows a consistent +${comparison.observedPpb!.toFixed(1)} ppb downwind anomaly.`
                : "No statistically consistent downwind anomaly is available for this comparison."}
            </small></span>
          </li>
          <li className={`evidence-check ${repeatObservations ? "pass" : "pending"}`}>
            <span aria-hidden="true">{repeatObservations ? "+" : "?"}</span>
            <span><strong>Repeat observations</strong><small>
              {repeatObservations
                ? `${new Set(tanager.observations.map((observation) => observation.observedAt.slice(0, 10))).size} observation dates are represented in the catalogue.`
                : "Only one observation date is currently represented in the public catalogue."}
            </small></span>
          </li>
          <li className="evidence-check pending">
            <span aria-hidden="true">?</span>
            <span><strong>Plume geometry and boundary overlap</strong><small>Required to test whether the plume origin overlaps the landfill boundary.</small></span>
          </li>
          <li className="evidence-check pending">
            <span aria-hidden="true">?</span>
            <span><strong>Timestamp-matched wind and repeat detections</strong><small>Required to confirm a persistent source across changing wind conditions.</small></span>
          </li>
          <li className="evidence-check pending">
            <span aria-hidden="true">?</span>
            <span><strong>Competing-source check</strong><small>Nearby gas, wastewater, agricultural and wetland source layers are not loaded yet.</small></span>
          </li>
        </ul>
      </div>
      <div className="tanager-summary">
        <span><strong>{nearest.toFixed(1)} km</strong><small>nearest source point</small></span>
        <span><strong>{rates.length ? `${Math.round(rates.reduce((sum, rate) => sum + rate, 0) / rates.length)} kg/h` : "—"}</strong><small>mean reported rate</small></span>
        <span><strong>~35 m</strong><small>typical Tanager GSD</small></span>
      </div>
      <div className="distance-profile">
        <strong>Detections by distance from landfill point</strong>
        {bandCounts.map((band) => (
          <div className="distance-row" key={band.label}>
            <span>{band.label}</span>
            <span className="distance-track"><i style={{ width: `${(band.count / maxBandCount) * 100}%` }} /></span>
            <b>{band.count}</b>
          </div>
        ))}
      </div>
      <div className="tanager-list">
        <strong className="timeline-label">Observation timeline</strong>
        {tanager.observations.map((observation) => (
          <div className="tanager-row" key={observation.plumeId}>
            <span>
              <strong>{formatDate(observation.observedAt)}</strong>
              <span className="muted"> · {observation.plumeId}</span>
            </span>
            <span className="tanager-rate">
              {observation.emissionKgPerHour === null
                ? "Rate unavailable"
                : `${Math.round(observation.emissionKgPerHour)} kg CH₄/h ± ${Math.round(observation.emissionUncertaintyKgPerHour ?? 0)}`}
            </span>
          </div>
        ))}
      </div>
      <p className="fine">
        Tanager observations are plume evidence, not a replacement for the engineering model. Emission estimates are
        catalog values and may be unavailable for some plumes. Distance bands use the registered landfill point, not a
        verified boundary or plume origin; they are a screening signal, not proof of landfill attribution.
      </p>
    </article>
  );
}

function EvidenceLayer({
  label,
  source,
  status,
  detail,
}: {
  label: string;
  source: string;
  status: "available" | "required";
  detail: string;
}) {
  return (
    <div className={`evidence-layer ${status}`}>
      <span className="evidence-layer-mark" aria-hidden="true">{status === "available" ? "✓" : "·"}</span>
      <span>
        <strong>{label}</strong>
        <small>{source} · {detail}</small>
      </span>
      <b>{status === "available" ? "Loaded" : "Required"}</b>
    </div>
  );
}

function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const radians = Math.PI / 180;
  const x = (lon2 - lon1) * radians * Math.cos(((lat1 + lat2) / 2) * radians);
  const y = (lat2 - lat1) * radians;
  return Math.sqrt(x * x + y * y) * 6371;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-AU", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(
    new Date(value),
  );
}
