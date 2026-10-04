import { useEffect, useRef, useState } from "react";
import type { TanagerSite } from "../data";
import { Info } from "./Info";
import { formatDate, yearEnd, yearStart } from "./TanagerEvidence";

const DEBOUNCE_MS = 250;

type Props = { observations: TanagerSite["observations"]; selectedDate: string; onDateChange: (date: string) => void };

export function ObservationScrubber({ observations, selectedDate, onDateChange }: Props) {
  // The thumb and label follow the draft immediately; the page and map only see the date once input pauses.
  const [draft, setDraft] = useState(selectedDate);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => setDraft(selectedDate), [selectedDate]);
  useEffect(() => () => clearTimeout(timer.current), []);

  const change = (value: number) => {
    const date = new Date(value).toISOString().slice(0, 10);
    setDraft(date);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => onDateChange(date), DEBOUNCE_MS);
  };

  return (
    <label className="year-scrubber">
      <span>
        <strong>
          Observation year
          <Info label="What the slider changes">The slider changes dated Tanager records and map points. Sentinel-5P remains a multi-pass annual screening result.</Info>
        </strong>
        <b>{formatDate(draft)}</b>
      </span>
      <input
        type="range"
        min={Date.parse(yearStart(observations))}
        max={Date.parse(yearEnd(observations))}
        value={Date.parse(draft)}
        step={86400000}
        onChange={(event) => change(Number(event.target.value))}
        aria-label="Show observations through date"
      />
      <span className="year-scrubber-range"><small>{formatDate(yearStart(observations))}</small><small>{formatDate(yearEnd(observations))}</small></span>
    </label>
  );
}
