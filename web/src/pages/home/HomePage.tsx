import { useEffect } from "react";
import { country, useData } from "../../data";
import { defaultAssumptions } from "../../data/assumptions";
import { JOURNEY } from "../../data/journey";
import { hrefFor } from "../../route";
import landfillLandscape from "../../assets/home/landfill-energy.webp";
import { HomeIcon } from "./HomeIcon";
import { HomeFoliage } from "./HomeFoliage";
import { HomeStory } from "./HomeStory";
import { WindComparison } from "./WindComparison";
import { useHomeReveal } from "./useHomeReveal";
import { showHowItWorks } from "./navigation";
import { Brand } from "../../components/Brand";
import "./home.css";

const landfillHref = hrefFor({ page: "find" });
const BENEFITS = [
  ["01", "Less methane escaping", "See how much additional methane a project could capture by 2035. Compare estimated emissions reductions in tonnes of CO₂ equivalent."],
  ["02", "A clearer investment case", "Weigh construction and running costs against potential revenue. Compare estimated payback and net cost per tonne to choose projects for further study."],
  ["03", "Electricity from recovered gas", "Explore how additional gas capture could generate electricity and sales revenue. Include potential Australian carbon credits where the project is eligible."],
];

export function HomePage() {
  const { sites } = useData();
  const coverage = new Map<string, number>();
  for (const site of sites) {
    const name = country(site);
    coverage.set(name, (coverage.get(name) ?? 0) + 1);
  }
  const revealRoot = useHomeReveal();

  useEffect(() => {
    if (window.location.hash === "#/how-it-works") showHowItWorks();
  }, []);

  return (
    <>
      <main className="page home" ref={revealRoot}>
        <HomeFoliage />
        <section className="home-hero" aria-labelledby="home-title">
          <div className="home-hero-copy" data-reveal="left">
            <p className="eyebrow">Climate Hack-tion 2026 · Build for 2035</p>
            <h1 id="home-title">Capture methane.<br /><em>Generate power.</em></h1>
            <p className="home-lede">
              Escaping landfill methane adds to climate change. Collecting more of that gas can reduce emissions and turn a wasted fuel into electricity.
            </p>
            <p className="home-intro">
              A free tool for councils, landfill operators and policy-makers in Australia and New Zealand.
              Compare capture projects, explore their costs and returns, and decide what to investigate and fund first.
            </p>
            <div className="actions">
              <a className="cta" href={landfillHref}>Explore landfills <span aria-hidden="true">↗</span></a>
              <button className="ghost" type="button" onClick={showHowItWorks}>
                How it works ↓
              </button>
            </div>
            <p className="fine">Explore new capture projects and improvements to existing systems.</p>
          </div>
          <figure className="home-visual home-hero-visual" data-reveal="right" data-reveal-delay="1">
            <img src={landfillLandscape} width={1448} height={1086} fetchPriority="high" alt="Pastel illustration of a sage-green terraced landfill with orange gas collection pipes, a cream generator building and an observation satellite" />
            <figcaption><span className="home-live-dot" aria-hidden="true" /> Collect landfill gas · Generate electricity <span>Illustration</span></figcaption>
          </figure>
        </section>

        <dl className="home-facts" aria-label="Project coverage">
          <div data-reveal="up"><dt><HomeIcon name="landfill" />{sites.length} landfills to explore</dt><dd>{[...coverage].map(([name, count]) => `${count} in ${name}`).join(" · ")}</dd></div>
          <div data-reveal="up" data-reveal-delay="1"><dt><HomeIcon name="satellite" />Satellite + wind data</dt><dd>Sentinel-5P methane · ERA5-Land winds</dd></div>
          <div data-reveal="up" data-reveal-delay="2"><dt><HomeIcon name="leaf" />One {defaultAssumptions.horizonYear} horizon</dt><dd>Compare the impact of acting sooner</dd></div>
        </dl>

        <HomeStory />

        <section id="home-how" className="home-section" aria-labelledby="home-how-title">
          <div className="home-section-head" data-reveal="up">
            <div><h2 id="home-how-title">How it works</h2><p className="home-section-subtitle">Four steps from a landfill to a funding decision.</p></div>
          </div>
          <ol className="steps home-steps">
            {JOURNEY.map(([step, text], index) => (
              <li key={step} data-reveal="up" data-reveal-delay={index}>
                <div className="home-step-top"><span className="step-num" aria-hidden="true">{index + 1}</span><h3>{step}</h3></div>
                <p>{text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="home-section home-evidence" aria-labelledby="home-evidence-title">
          <div className="home-section-head" data-reveal="up">
            <div><h2 id="home-evidence-title">Spot a methane signal</h2><p className="home-section-subtitle">Satellite observations, with wind for context.</p></div>
            <p>Sentinel-5P observes methane across the region. Wind data helps us compare readings upwind and downwind over multiple passes. A persistent difference can flag a source worth investigating.</p>
          </div>
          <WindComparison />
          <div className="home-evidence-note" data-reveal="up">
            <strong>A signal, with context.</strong>
            <div>
              <p><strong>We compare methane on either side of the landfill.</strong> The upwind side is where the wind comes from; the downwind side is where it travels towards. For each satellite pass, we use wind data to identify these sides and compare average methane readings in areas 10–30 km from the site.</p>
              <p><strong>A higher downwind reading can point to a methane source nearby.</strong> We look for a repeated increase above the upwind background across multiple usable passes, allowing for uncertainty. A clear increase flags the area for closer investigation. Without one, emissions may still be present but too diluted or poorly covered for the satellite to detect.</p>
              <p><strong>The next step is to identify the source.</strong> Sentinel-5P observes a broad area, which may include farms, wetlands and other facilities as well as the landfill. The comparison helps decide where to investigate; it cannot confirm the landfill’s contribution or quantify its emissions. Our separate project model estimates potential costs, returns and emissions savings.</p>
              <a className="home-source" href="https://www.esa.int/Applications/Observing_the_Earth/Methane_and_ozone_data_products_from_Copernicus_Sentinel-5P" target="_blank" rel="noreferrer">How wind affects methane observations · ESA ↗</a>
            </div>
          </div>
        </section>

        <section className="home-section" aria-labelledby="home-benefits-title">
          <div className="home-section-head" data-reveal="up">
            <div><h2 id="home-benefits-title">Compare costs and climate benefits</h2></div>
            <p>Adjust your assumptions to compare project scenarios. Estimates count capture above the site’s existing system; satellite readings are assessed separately and do not set the emissions savings.</p>
          </div>
          <div className="home-benefits">
            {BENEFITS.map(([number, title, text], index) => (
              <article className="card" key={number} data-reveal="left" data-reveal-delay={index}>
                <span className="home-benefit-number">{number}</span>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="home-start" aria-labelledby="home-start-title" data-reveal="up">
          <div>
            <div className="brand home-start-brand"><Brand reverse /></div>
            <p className="eyebrow">Climate Hack-tion · Build for 2035</p>
            <h2 id="home-start-title">Which capture projects should we fund first?</h2>
            <p>Built for Climate Hack-tion’s “Build for 2035” challenge. Explore a budget, compare sites and review our COP31 alignment check to shortlist projects for detailed study.</p>
          </div>
          <a className="cta light" href={landfillHref}>Explore landfills <span aria-hidden="true">↗</span></a>
        </section>

      </main>
    </>
  );
}
