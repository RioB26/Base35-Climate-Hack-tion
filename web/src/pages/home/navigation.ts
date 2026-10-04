/** Both home calls to action scroll below the sticky navigation. */
export function showHowItWorks() {
  const section = document.getElementById("home-how");
  if (!section) {
    window.location.hash = "#/how-it-works";
    return;
  }
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  section.scrollIntoView({ behavior: reduceMotion ? "instant" : "smooth" });
}

export function showHome() {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.scrollTo({ top: 0, behavior: reduceMotion ? "instant" : "smooth" });
}
