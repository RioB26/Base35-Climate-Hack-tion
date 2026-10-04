import { hrefFor } from "../../route";
import { showHome, showHowItWorks } from "./navigation";
import { Brand } from "../../components/Brand";

const repository = "https://github.com/RioB26/Base35-Climate-Hack-tion";

// Selected from docs/DISCLOSURES.md; the full register includes site-specific sources.
const RESEARCH_SOURCES = [
  ["US EPA · Landfill gas", "https://www.epa.gov/lmop/basic-information-about-landfill-gas"],
  ["US EPA · Project economics (PDF)", "https://www.epa.gov/system/files/documents/2021-07/pdh_chapter4.pdf"],
  ["Copernicus · Sentinel-5P methane", "https://developers.google.com/earth-engine/datasets/catalog/COPERNICUS_S5P_OFFL_L3_CH4"],
  ["ECMWF · ERA5-Land winds", "https://developers.google.com/earth-engine/datasets/catalog/ECMWF_ERA5_LAND_HOURLY"],
  ["AEMO · Electricity market research", "https://www.aemo.com.au/newsroom/media-release/qed-q2-2026"],
  ["CER · Australian carbon markets", "https://cer.gov.au/markets/reports-and-data/quarterly-carbon-market-reports/quarterly-carbon-market-report-march-quarter-2026/australian-environmental-markets"],
];

export function HomeFooter() {
  return (
    <footer className="home-footer" aria-label="Project information and research sources">
      <div className="home-footer-inner">
        <div className="home-footer-grid">
          <div className="home-footer-about">
            <a href={hrefFor({ page: "home" })} className="brand" onClick={showHome}>
              <Brand />
            </a>
            <p>A free tool to help Australia and New Zealand prioritise landfill methane projects. Compare additional gas capture, electricity generation and investment towards 2035.</p>
            <span className="home-footer-tagline">Capture methane. Generate power.</span>
          </div>

          <nav className="home-footer-column" aria-labelledby="home-footer-project">
            <h2 id="home-footer-project">Explore the project</h2>
            <ul>
              <li><a href={hrefFor({ page: "home" })} onClick={showHome}>Home</a></li>
              <li><a href={hrefFor({ page: "find" })}>Explore landfills</a></li>
              <li><button type="button" onClick={showHowItWorks}>How it works</button></li>
              <li><a href={`${repository}/blob/main/docs/METHODOLOGY.md`} target="_blank" rel="noreferrer">Methods &amp; assumptions ↗</a></li>
              <li><a href={repository} target="_blank" rel="noreferrer">Project on GitHub ↗</a></li>
            </ul>
          </nav>

          <nav className="home-footer-column" aria-labelledby="home-footer-research">
            <h2 id="home-footer-research">Research &amp; data</h2>
            <ul>
              {RESEARCH_SOURCES.map(([label, href]) => (
                <li key={href}><a href={href} target="_blank" rel="noreferrer">{label} ↗</a></li>
              ))}
              <li><a href={`${repository}/blob/main/docs/DISCLOSURES.md`} target="_blank" rel="noreferrer">Full source register ↗</a></li>
            </ul>
          </nav>

          <div className="home-footer-column home-footer-context">
            <h2>Built for climate action</h2>
            <p>Created for Climate Hack-tion 2026: zero waste and methane reduction, with a shared horizon of 2035. Our COP31 alignment check uses the team’s own rubric.</p>
            <a href="https://sustainable.org.nz/learn/events/climate-hack-tion-challenge-build-for-2035/" target="_blank" rel="noreferrer">About Climate Hack-tion ↗</a>
            <a className="home-footer-cop" href="https://unfccc.int/cop31" target="_blank" rel="noreferrer">Explore COP31 <span aria-hidden="true">↗</span></a>
            <p className="home-footer-affiliation">An independent prototype, not an official COP31 tool.</p>
          </div>
        </div>

        <div className="home-footer-transparency">
          <strong>Transparent by design.</strong>
          <p>A first screen for detailed study. Inputs include sourced figures, operator reports and clearly flagged assumptions. Project results are estimates; satellite signals cannot establish a landfill’s emissions. Illustrations show concepts, not measured data.</p>
        </div>
        <div className="home-footer-bottom">
          <p>© {new Date().getFullYear()} Sentinel Sniff · Climate Hack-tion</p>
          <button type="button" onClick={showHome}>Back to top ↑</button>
        </div>
      </div>
    </footer>
  );
}
