import mark from "../assets/brand/mark-color.svg";
import reverseMark from "../assets/brand/mark-reverse.svg";

/** Supplied SVG mark with a live wordmark so it uses the app's Fraunces font. */
export function Brand({ reverse = false }: { reverse?: boolean }) {
  return (
    <span className={`brand-identity${reverse ? " brand-identity-reverse" : ""}`}>
      <img className="brand-mark" src={reverse ? reverseMark : mark} width={40} height={40} alt="" aria-hidden="true" />
      <span className="brand-wordmark">Sentinel <em>Sniff</em></span>
    </span>
  );
}
