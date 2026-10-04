import { fmtInt } from "../format";
import { homeKWhPerYear, homesPerIcon, homesPowered } from "../model/homes";
import type { Site } from "../model/types";

/** How many typical homes the captured gas could power, drawn as a grid of houses. */
export function HomesPowered({ site, electricityMWhPerYear }: { site: Site; electricityMWhPerYear: number }) {
  const homes = homesPowered(electricityMWhPerYear, site);
  if (homes < 1) return null;
  const unit = homesPerIcon(homes);
  const full = Math.floor(homes / unit);
  const part = homes / unit - full;
  const icons = Array.from({ length: full + (part >= 0.1 ? 1 : 0) }, (_, i) => (i < full ? 1 : part));
  const rounded = homes >= 1000 ? Math.round(homes / 100) * 100 : Math.round(homes);
  const nz = site.state === "NZ";
  const kWh = homeKWhPerYear(site) ?? 0;

  return (
    <article className="card homes">
      <div className="homes-text">
        <p className="eyebrow">Power for homes</p>
        <p className="homes-big">
          Enough electricity for about <span className="num">{fmtInt(rounded)}</span> homes
        </p>
        <p className="small muted">
          {fmtInt(electricityMWhPerYear)} MWh a year from the captured gas, at {fmtInt(kWh)} kWh a year for a typical{" "}
          {nz ? "New Zealand" : "Australian"} home ({nz ? "MBIE" : "energy.gov.au"}). Flaring the gas instead would cut the same
          methane but power none.
        </p>
      </div>
      <figure className="homes-grid" aria-label={`About ${fmtInt(rounded)} homes; each house stands for ${fmtInt(unit)}`}>
        <div className="houses" aria-hidden="true">
          {icons.map((fill, i) => (
            <House key={i} fill={fill} />
          ))}
        </div>
        <figcaption className="small muted">
          Each house = {fmtInt(unit)} {unit === 1 ? "home" : "homes"}
        </figcaption>
      </figure>
    </article>
  );
}

const HOUSE = "M12 2.5 1.5 11h3v10.5h5.5V15h4v6.5h5.5V11h3Z";

function House({ fill }: { fill: number }) {
  const id = fill < 1 ? `part-${Math.round(fill * 100)}` : undefined;
  return (
    <svg viewBox="0 0 24 24" className="house">
      {id && (
        <defs>
          <clipPath id={id}>
            <rect x="0" y="0" width={24 * fill} height="24" />
          </clipPath>
        </defs>
      )}
      <path d={HOUSE} className="house-empty" />
      <path d={HOUSE} className="house-full" clipPath={id ? `url(#${id})` : undefined} />
    </svg>
  );
}
