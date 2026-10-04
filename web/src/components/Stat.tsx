import { Info } from "./Info";
import type { ReactNode } from "react";

export function Stat({ label, value, sub, info, tone }: { label: string; value: ReactNode; sub?: ReactNode; info?: ReactNode; tone?: "accent" | "sky" }) {
  return (
    <div className={`stat ${tone ?? ""}`}>
      <span className="stat-label">
        {label}
        {info && <Info label={`About ${label.toLowerCase()}`}>{info}</Info>}
      </span>
      <span className="stat-value">{value}</span>
      {sub && <span className="stat-sub">{sub}</span>}
    </div>
  );
}
