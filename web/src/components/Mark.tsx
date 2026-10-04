import mark from "../assets/brand/mark-color.svg";
import reverseMark from "../assets/brand/mark-reverse.svg";

/** Use the supplied mark consistently in wordmarks and loading states. */
export function Mark({ size = 40, tone = "color", className }: { size?: number; tone?: "color" | "reverse"; className?: string }) {
  return (
    <img src={tone === "reverse" ? reverseMark : mark} width={size} height={size} className={className} alt="" aria-hidden="true" />
  );
}

/** Mark plus a short status line, used while the lazy map and 3D chunks load. */
export function Loading({ label, className }: { label: string; className: string }) {
  return (
    <div className={`${className} brand-loading`} role="status">
      <Mark size={44} className="loading-mark" />
      <span>{label}</span>
    </div>
  );
}

/** Keep the workflow available when a browser cannot render an interactive view. */
export function VisualFallback({ title, detail, className }: { title: string; detail: string; className: string }) {
  return (
    <div className={`${className} visual-fallback`} role="status">
      <Mark size={48} />
      <strong>{title}</strong>
      <p>{detail}</p>
    </div>
  );
}
