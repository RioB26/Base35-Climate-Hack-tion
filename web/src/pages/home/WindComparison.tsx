import windComparison from "../../assets/home/wind-comparison.webp";

/** HTML labels stay sharp, accessible and responsive over the illustrative scene. */
export function WindComparison() {
  return (
    <figure className="home-visual home-wind-visual" data-reveal="up">
      <div className="home-wind-scene">
        <img src={windComparison} width={1536} height={1024} loading="lazy" alt="Conceptual illustration: blue air flows toward a terraced landfill from the left, with an orange methane plume flowing away to the right" />
        <div className="home-wind-direction">Wind direction <span aria-hidden="true">⟶</span></div>
        <div className="home-wind-label home-wind-upwind">
          <h3>Upwind</h3><p>Background methane<br />Lower concentration</p>
        </div>
        <div className="home-wind-label home-wind-downwind">
          <h3>Downwind</h3><p>Enhanced methane plume<br />Higher concentration</p>
        </div>
        <span className="home-wind-landfill">Landfill</span>
        <div className="home-wind-bottom">
          <p>Air approaching the site<span>Background methane levels</span></p>
          <p>Air moving away<span>Potentially elevated methane levels</span></p>
        </div>
      </div>
      <figcaption>Compare methane on either side of the site <span>Illustrative · not measured data</span></figcaption>
    </figure>
  );
}
