import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useState } from "react";
import { shortName } from "../format";
import type { Site } from "../model/types";
import { CurrencyAnchor } from "./currency";
import { bundledStyle } from "./basemap";
import { VisualFallback } from "./Mark";

type Props = {
  sites: Site[];
  /** Site the globe should fly to; null shows the whole region. */
  target: string | null;
  onPick: (id: string) => void;
  /** Called when the fly-in to `target` finishes. */
  onArrive: (id: string) => void;
};

const HOME = [152, -30] as [number, number];
const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

export default function GlobeView({ sites, target, onPick, onArrive }: Props) {
  const [unavailable, setUnavailable] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markers = useRef<Record<string, HTMLDivElement>>({});
  const spinning = useRef(!reduceMotion);
  const arrive = useRef(onArrive);
  arrive.current = onArrive;

  useEffect(() => {
    let m: maplibregl.Map;
    try {
      m = new maplibregl.Map({
        container: container.current!,
        style: bundledStyle(true),
        center: HOME,
        zoom: window.innerWidth < 700 ? 1.5 : 2.2,
        attributionControl: { compact: true, customAttribution: "Natural Earth" },
        renderWorldCopies: false,
      });
    } catch {
      setUnavailable(true);
      return;
    }
    // Keep the globe clear of the search card, including after a viewport resize.
    const setPadding = () => m.setPadding({
      left: window.innerWidth < 700 ? 0 : Math.min(460, window.innerWidth * 0.3),
      top: 0, right: 0, bottom: 0,
    });
    setPadding();
    m.on("resize", setPadding);
    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");
    const stop = () => (spinning.current = false);
    m.on("mousedown", stop);
    m.on("touchstart", stop);
    m.on("wheel", stop);

    // A slow drift east until someone touches the globe.
    let frame = 0;
    const spin = () => {
      if (spinning.current && !m.isMoving()) {
        const c = m.getCenter();
        m.setCenter([c.lng + 0.03, c.lat]);
      }
      frame = requestAnimationFrame(spin);
    };
    m.on("load", () => (frame = requestAnimationFrame(spin)));

    for (const s of sites) {
      const el = document.createElement("button");
      el.type = "button";
      el.className = "pin globe-pin";
      el.setAttribute("aria-label", `Open ${s.name}`);
      el.innerHTML = '<span class="pin-dot"></span><span class="pin-label"></span>';
      el.querySelector<HTMLSpanElement>(".pin-label")!.textContent = shortName(s.name);
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        onPick(s.id);
      });
      new maplibregl.Marker({ element: el, anchor: "left" }).setLngLat([s.lon, s.lat]).addTo(m);
      markers.current[s.id] = el as unknown as HTMLDivElement;
    }
    map.current = m;
    return () => {
      cancelAnimationFrame(frame);
      m.remove();
      map.current = null;
      markers.current = {};
    };
    // Sites are static for the lifetime of the page.
  }, []);

  useEffect(() => {
    const m = map.current;
    if (unavailable && target) {
      arrive.current(target);
      return;
    }
    if (!m) return;
    for (const [id, el] of Object.entries(markers.current)) el.classList.toggle("selected", id === target);
    if (!target) return;
    const s = sites.find((x) => x.id === target);
    if (!s) return;
    spinning.current = false;
    const done = () => arrive.current(target);
    if (reduceMotion) {
      m.jumpTo({ center: [s.lon, s.lat], zoom: 7 });
      done();
      return;
    }
    m.flyTo({ center: [s.lon, s.lat], zoom: 7.5, duration: 2600, curve: 1.5, essential: true });
    m.once("moveend", done);
    return () => {
      m.off("moveend", done);
    };
  }, [target, sites, unavailable]);

  if (unavailable) {
    return <VisualFallback className="globe-wrap globe-fallback" title="Interactive globe unavailable" detail="Choose a landfill from the list to continue. The screening and project tools are still available." />;
  }

  // MapLibre forces position: relative on its container, so the sizing lives on a wrapper.
  return (
    <div className="globe-wrap">
      <div ref={container} className="globe" aria-label="Globe showing landfills in Australia and New Zealand" />
      <CurrencyAnchor />
    </div>
  );
}
