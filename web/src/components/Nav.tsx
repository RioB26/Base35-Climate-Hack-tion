import { hrefFor, STEPS, type Route } from "../route";
import { shortName } from "../format";
import type { Site } from "../model/types";

/** Brand plus the Find → Check → Fix → Fund stepper. Later steps unlock once a landfill is picked. */
export function Nav({ route, site }: { route: Route; site: Site | null }) {
  const current = STEPS.findIndex((s) => s.page === route.page);
  return (
    <nav className="nav">
      <a href="#/" className="brand">
        <span className="brand-mark" aria-hidden="true" />
        Methane Payback
      </a>
      {route.page === "home" ? (
        <div className="home-nav-links">
          <a className="home-nav-link" href={hrefFor({ page: "home" })} aria-current="page">Home</a>
          <a className="cta" href={hrefFor({ page: "find" })}>Explore landfills ↗</a>
        </div>
      ) : (
        <ol className="stepper">
          {STEPS.map((s, i) => {
            const href = s.page === "find" ? hrefFor({ page: "find" }) : site ? hrefFor({ page: s.page, siteId: site.id }) : undefined;
            const state = i === current ? "current" : i < current ? "done" : "todo";
            return (
              <li key={s.page} className={state}>
                {href ? (
                  <a href={href} aria-current={i === current ? "step" : undefined}>
                    <span className="step-dot">{i + 1}</span>
                    <span className="step-name">{s.label}</span>
                  </a>
                ) : (
                  <span className="disabled">
                    <span className="step-dot">{i + 1}</span>
                    <span className="step-name">{s.label}</span>
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      )}
      {route.page !== "home" && <span className="nav-site">{site ? shortName(site.name) : ""}</span>}
    </nav>
  );
}

/** Page heading shared by the three site steps. */
export function PageHead({ step, title, sub, children }: { step: string; title: string; sub: string; children?: React.ReactNode }) {
  return (
    <header className="page-head">
      <p className="eyebrow">{step}</p>
      <h1>{title}</h1>
      <p className="page-sub">{sub}</p>
      {children}
    </header>
  );
}
