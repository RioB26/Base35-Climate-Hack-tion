import { Mark } from "./Mark";

/** Supplied SVG mark with a live wordmark so it uses the app's Fraunces font. */
export function Brand({ reverse = false }: { reverse?: boolean }) {
  return (
    <span className={`brand-identity${reverse ? " brand-identity-reverse" : ""}`}>
      <Mark tone={reverse ? "reverse" : "color"} className="brand-mark" />
      <span className="brand-wordmark">Sentinel <em>Sniff</em></span>
    </span>
  );
}
