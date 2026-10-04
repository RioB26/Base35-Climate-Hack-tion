/** Separate the emissions problem, the investment question and the proposed response. */
export function HomeStory() {
  return (
    <section className="home-section" aria-label="The problem, where to invest and the solution">
      <div className="home-problem-solution">
        <article className="card home-story-card home-problem" data-reveal="left">
          <div className="home-story-heading"><span aria-hidden="true">01</span><h2>The problem</h2></div>
          <p className="home-story-lede">Landfills leak methane.</p>
          <p>Buried food scraps and other organic waste break down without oxygen, producing landfill gas that contains methane and CO₂.</p>
          <p>Escaping methane contributes to climate change. It also means losing a fuel that could be collected and used to generate electricity.</p>
          <a className="home-source" href="https://www.epa.gov/lmop/basic-information-about-landfill-gas" target="_blank" rel="noreferrer">Why landfill gas matters · US EPA ↗</a>
        </article>

        <article className="card home-story-card home-statement" data-reveal="left" data-reveal-delay="1">
          <div className="home-story-heading"><span aria-hidden="true">02</span><h2>Where to invest</h2></div>
          <p className="home-story-lede">Which upgrades are worth funding?</p>
          <p>Some landfills already collect gas and generate electricity. With limited budgets, councils and operators need to know where additional capture could deliver the most value.</p>
          <p>The question is what to fund first: how much methane could be captured, what would the project cost, and could electricity sales help pay for it?</p>
        </article>

        <article className="card home-story-card home-solution" data-reveal="left" data-reveal-delay="2">
          <div className="home-story-heading"><span aria-hidden="true">03</span><h2>The solution</h2></div>
          <p className="home-story-lede">Capture more gas. Generate power.</p>
          <p>Wells and pipes collect landfill gas. After treatment, it can fuel engines that generate electricity for use on site or sale to the grid.</p>
          <ol className="home-energy-process" aria-label="How gas becomes electricity">
            <li><span>01</span> Collect gas</li>
            <li><span>02</span> Treat gas</li>
            <li><span>03</span> Generate power</li>
          </ol>
          <p><strong>Sentinel Sniff helps choose where to start.</strong> Screen sites, model additional capture and compare costs, potential returns and emissions reductions.</p>
          <p className="home-combustion-note">Burning the gas still releases CO₂. Our estimate covers reduced methane emissions, rather than the project’s full lifecycle footprint.</p>
        </article>
      </div>

      <div className="home-existing" data-reveal="up">
        <div>
          <strong>Better capture builds on what already works.</strong>
          <p>Mugga Lane already generates electricity from landfill gas. We use existing capture as the baseline, so our estimates count only the additional gas a project could recover.</p>
        </div>
        <a href="https://www.cityservices.act.gov.au/__data/assets/pdf_file/0003/1653393/Mugga-Lane-Gas-to-Energy-factsheet-August2025-acc.pdf" target="_blank" rel="noreferrer">See Mugga Lane in action ↗</a>
      </div>
      <p className="home-prevention">Preventing waste and keeping organics out of landfill remain essential. Gas recovery tackles waste already buried, alongside diversion and composting. <a href="https://www.epa.gov/lmop/frequent-questions-about-landfill-gas" target="_blank" rel="noreferrer">Learn more ↗</a></p>
    </section>
  );
}
