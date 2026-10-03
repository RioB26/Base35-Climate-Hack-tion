import { shortName } from "../format";
import type { Site } from "../model/types";

type Props = { sites: Site[]; selectedId: string; onSelect: (id: string) => void };

export function SitePicker({ sites, selectedId, onSelect }: Props) {
  return (
    <div className="picker" role="tablist" aria-label="Choose a landfill">
      {sites.map((s) => (
        <button
          key={s.id}
          type="button"
          role="tab"
          aria-selected={s.id === selectedId}
          className={`chip ${s.id === selectedId ? "on" : ""}`}
          onClick={() => onSelect(s.id)}
        >
          <span className="chip-flag">{s.state === "NZ" ? "NZ" : s.state}</span>
          {shortName(s.name)}
        </button>
      ))}
    </div>
  );
}
