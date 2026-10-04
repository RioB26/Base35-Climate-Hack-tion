/** Both home calls to action scroll below the sticky navigation. */
export function showHowItWorks() {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.getElementById("home-how")?.scrollIntoView({ behavior: reduceMotion ? "instant" : "smooth" });
}

export function showHome() {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.scrollTo({ top: 0, behavior: reduceMotion ? "instant" : "smooth" });
}
