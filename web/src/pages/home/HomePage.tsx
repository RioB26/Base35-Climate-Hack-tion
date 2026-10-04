import { sites } from "../../data";
import { defaultAssumptions } from "../../data/assumptions";
import { hrefFor } from "../../route";
import landfillLandscape from "../../assets/home/landfill-energy.webp";
import { HomeIcon } from "./HomeIcon";
import { HomeFoliage } from "./HomeFoliage";
import { HomeFooter } from "./HomeFooter";
import { HomeStory } from "./HomeStory";
import { WindComparison } from "./WindComparison";
import { useHomeReveal } from "./useHomeReveal";
import { showHowItWorks } from "./navigation";
import { Brand } from "../../components/Brand";
import "./home.css";

const landfillHref = hrefFor({ page: "find" });
const JOURNEY = [
  ["Find", "Search the globe for a landfill in Australia or New Zealand and explore its site data."],
  ["Check", "Compare site-reported figures with a satellite methane signal, using wind to guide the analysis."],
  ["Fix", "Explore a 3D landfill and set your capture target, start year, electricity price and project costs."],
  ["Fund", "Estimate investment and returns, then rank sites by net cost per tonne of emissions avoided."],
];
const BENEFITS = [
  ["01", "Less methane escaping", "See how much additional methane a project could capture by 2035. Compare estimated emissions reductions in tonnes of CO₂ equivalent."],
  ["02", "A clearer investment case", "Weigh construction and running costs against potential revenue. Compare estimated payback and net cost per tonne to choose projects for further study."],
  ["03", "Electricity from recovered gas", "Explore how additional gas capture could generate electricity and sales revenue. Include potential Australian carbon credits where the project is eligible."],
];

export function HomePage() {
  const australia = sites.filter((site) => site.state !== "NZ").length;
  const revealRoot = useHomeReveal();

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
            <img src={landfillLandscape} width={1448} height={1086} fetchPriority="high" alt="Detailed countryside illustration of a terraced landfill, orange gas collection pipes, a generator building and an observation satellite" />
            <figcaption><span className="home-live-dot" aria-hidden="true" /> Collect landfill gas · Generate electricity <span>Illustration</span></figcaption>
          </figure>
        </section>

        <dl className="home-facts" aria-label="Project coverage">
          <div data-reveal="up"><dt><HomeIcon name="landfill" />{sites.length} real landfills</dt><dd>{australia} in Australia · {sites.length - australia} in New Zealand</dd></div>
          <div data-reveal="up" data-reveal-delay="1"><dt><HomeIcon name="satellite" />Satellite + wind data</dt><dd>Sentinel-5P methane · ERA5-Land winds</dd></div>
          <div data-reveal="up" data-reveal-delay="2"><dt><HomeIcon name="leaf" />One {defaultAssumptions.horizonYear} horizon</dt><dd>Compare the impact of acting sooner</dd></div>
        </dl>

        <HomeStory />

        <section id="home-how" className="home-section" aria-labelledby="home-how-title">
          <div className="home-section-head" data-reveal="up">
            <div><h2 id="home-how-title">How it works</h2><p className="home-section-subtitle">Four steps from a landfill to a funding decision.</p></div>
            <p>Start with a site, check the methane signal, then explore a capture project. A separate model estimates what it could cost, earn and achieve by 2035.</p>
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
            <p>The satellite gives a screening signal, not proof. Farms, wetlands and other facilities may contribute, so a higher downwind reading does not establish the landfill’s emissions.</p>
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
      <HomeFooter />
    </>
  );
}
