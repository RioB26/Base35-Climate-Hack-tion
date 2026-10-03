import { sites } from "../data";
import { defaultAssumptions } from "../data/assumptions";
import { hrefFor } from "../route";
import landfillLandscape from "../assets/landfill-landscape.svg";
import windScreening from "../assets/wind-screening.svg";
import "./home.css";

const landfillHref = hrefFor({ page: "find" });
const JOURNEY = [
  ["Find", "Start with a place.", "Explore the map and choose a landfill in Australia or New Zealand."],
  ["Check", "Look at the evidence.", "Compare upwind and downwind satellite methane readings, alongside site estimates."],
  ["Fix", "Explore what could change.", "Set a capture target, a start year and the assumptions for a gas-to-energy project."],
  ["Fund", "See what it would take.", "Compare investment, potential revenue and emissions avoided within your budget."],
];
const BENEFITS = [
  ["01", "Less methane escaping", "Estimate extra methane captured and emissions avoided by 2035, expressed as CO₂ equivalents to compare climate impact."],
  ["02", "A clearer investment case", "Compare construction and running costs with potential revenue. See estimated payback and the net cost per tonne of emissions avoided."],
  ["03", "Electricity from recovered gas", "Estimate electricity generation and sales revenue from additional capture, with potential Australian carbon credits where eligible."],
];

export function HomePage() {
  const australia = sites.filter((site) => site.state !== "NZ").length;

  const showHowItWorks = () => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.getElementById("home-how")?.scrollIntoView({ behavior: reduceMotion ? "instant" : "smooth" });
  };

  return (
    <main className="page home">
      <section className="home-hero" aria-labelledby="home-title">
        <div className="home-hero-copy">
          <p className="eyebrow">Climate Hack-tion 2026 · Build for 2035</p>
          <h1 id="home-title">Capture methane.<br /><em>Generate power.</em></h1>
          <p className="home-lede">
            Buried waste produces methane. Capturing more of it can cut emissions and fuel electricity generation.
          </p>
          <p className="home-intro">
            Methane Payback helps councils, landfill operators and funders compare where better gas capture could make sense:
            what it could cost, earn and achieve by 2035.
          </p>
          <div className="actions">
            <a className="cta" href={landfillHref}>Explore landfills <span aria-hidden="true">↗</span></a>
            <button className="ghost" type="button" onClick={showHowItWorks}>
              How it works ↓
            </button>
          </div>
          <p className="fine">Explore new capture projects and improvements to existing systems.</p>
        </div>
        <figure className="home-visual home-hero-visual">
          <img src={landfillLandscape} width={640} height={520} alt="Illustration of a landfill with gas collection wells, a generator and a satellite overhead" />
          <figcaption><span className="home-live-dot" aria-hidden="true" /> Collect landfill gas · Generate electricity <span>Illustration</span></figcaption>
        </figure>
      </section>

      <dl className="home-facts" aria-label="Project coverage">
        <div><dt>{sites.length} real landfills</dt><dd>{australia} in Australia · {sites.length - australia} in New Zealand</dd></div>
        <div><dt>Satellite + wind data</dt><dd>Sentinel-5P methane · ERA5-Land winds</dd></div>
        <div><dt>One {defaultAssumptions.horizonYear} horizon</dt><dd>Compare the impact of acting sooner</dd></div>
      </dl>

      <section className="home-section" aria-label="The problem and the solution">
        <div className="home-problem-solution">
          <article className="card home-problem">
            <p className="eyebrow">The problem</p>
            <h2>Buried waste keeps releasing gas.</h2>
            <p>Food scraps and other organic material break down without oxygen inside a landfill, producing methane and carbon dioxide.</p>
            <p>When methane escapes, it adds to climate change. It also means losing a gas that could be used as fuel.</p>
            <a className="home-source" href="https://www.epa.gov/lmop/basic-information-about-landfill-gas" target="_blank" rel="noreferrer">Why landfill gas matters · US EPA ↗</a>
          </article>
          <article className="card home-solution">
            <p className="eyebrow">The solution</p>
            <h2>Collect the gas. Put it to work.</h2>
            <p>Wells and pipes collect landfill gas. After treatment, the gas can fuel engines that generate electricity for use or sale.</p>
            <ol className="home-energy-process" aria-label="How gas becomes electricity">
              <li><span>01</span> Collect gas</li>
              <li><span>02</span> Treat gas</li>
              <li><span>03</span> Generate power</li>
            </ol>
            <p className="home-combustion-note">Engines still emit CO₂. The climate benefit comes from reducing methane that would otherwise escape.</p>
          </article>
        </div>
        <div className="home-existing">
          <div>
            <strong>Some landfills already generate power.</strong>
            <p>Our opportunity is to capture more of the gas that escapes. Only improvements above existing capture count in the estimates.</p>
          </div>
          <a href="https://www.cityservices.act.gov.au/__data/assets/pdf_file/0003/1653393/Mugga-Lane-Gas-to-Energy-factsheet-August2025-acc.pdf" target="_blank" rel="noreferrer">See Mugga Lane in action ↗</a>
        </div>
        <p className="home-prevention">Keeping organic waste out of landfill remains important. Recovering gas from waste already buried can complement waste prevention and composting. <a href="https://www.epa.gov/lmop/frequent-questions-about-landfill-gas" target="_blank" rel="noreferrer">Learn more ↗</a></p>
      </section>

      <section id="home-how" className="home-section" aria-labelledby="home-how-title">
        <div className="home-section-head">
          <div><p className="eyebrow">How it works</p><h2 id="home-how-title">Our role: find projects worth investigating.</h2></div>
          <p>We connect satellite screening with a separate project model, so you can compare costs, potential returns and methane reductions.</p>
        </div>
        <ol className="steps home-steps">
          {JOURNEY.map(([step, title, text], index) => (
            <li key={step}>
              <div className="home-step-top"><span className="step-num">{index + 1}</span><span>{step}</span></div>
              <h3>{title}</h3>
              <p>{text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="home-section home-evidence" aria-labelledby="home-evidence-title">
        <figure className="home-visual home-evidence-visual">
          <img src={windScreening} width={640} height={360} loading="lazy" alt="Diagram comparing air approaching a landfill upwind with air moving away downwind" />
          <figcaption>Compare methane on either side of the site <span>Illustrative · not measured data</span></figcaption>
        </figure>
        <div>
          <p className="eyebrow">Check the signal</p>
          <h2 id="home-evidence-title">Where should we look closer?</h2>
          <p>We compare methane in air approaching a landfill with methane in air moving away, using wind data across multiple satellite passes.</p>
          <p>A consistently higher downwind reading can flag a nearby methane source and a reason to investigate.</p>
          <div className="home-evidence-note">
            <strong>A signal, with context.</strong>
            <p>Nearby farms, wetlands and other facilities can also contribute. The satellite comparison cannot prove that the landfill caused the signal or directly measure its emissions.</p>
          </div>
        </div>
      </section>

      <section className="home-section" aria-labelledby="home-benefits-title">
        <div className="home-section-head">
          <div><p className="eyebrow">Plan the opportunity</p><h2 id="home-benefits-title">What could better capture deliver?</h2></div>
          <p>Change the capture target, start year and prices to explore estimated costs and benefits. Satellite readings do not determine the emissions savings.</p>
        </div>
        <div className="home-benefits">
          {BENEFITS.map(([number, title, text]) => (
            <article className="card" key={number}>
              <span className="home-benefit-number">{number}</span>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="home-start" aria-labelledby="home-start-title">
        <div>
          <p className="eyebrow">Climate Hack-tion · Build for 2035</p>
          <h2 id="home-start-title">Which capture projects should we fund first?</h2>
          <p>Built ahead of COP31, our prototype turns waste and methane reduction into practical funding choices for 2035.</p>
        </div>
        <a className="cta light" href={landfillHref}>Explore landfills <span aria-hidden="true">↗</span></a>
      </section>

      <footer className="home-footer">
        <div><strong>Transparent by design.</strong><p>Some inputs are estimates or operator-reported figures. Results guide further study; costs, revenue and emissions reductions are not guaranteed outcomes.</p></div>
        <a href="https://github.com/RioB26/Base35-Climate-Hack-tion/tree/main/docs" target="_blank" rel="noreferrer">Methods &amp; sources ↗</a>
      </footer>
    </main>
  );
}
