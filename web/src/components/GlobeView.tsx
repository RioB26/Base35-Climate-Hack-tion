import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef } from "react";
import { shortName } from "../format";
import type { Site } from "../model/types";
import { CurrencyAnchor } from "./currency";
import { bundledStyle } from "./basemap";

type Props = {
  sites: Site[];
  /** Site the globe should fly to; null shows the whole region. */
  target: string | null;
  onPick: (id: string) => void;
  /** Called when the fly-in to `target` finishes. */
  onArrive: (id: string) => void;
};

const narrow = window.innerWidth < 700;
const HOME = { center: [152, -30] as [number, number], zoom: narrow ? 1.5 : 2.2 };
// Keep the globe clear of the search card on wide screens.
const PADDING = narrow ? 0 : Math.min(460, window.innerWidth * 0.3);
const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

export default function GlobeView({ sites, target, onPick, onArrive }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markers = useRef<Record<string, HTMLDivElement>>({});
  const spinning = useRef(!reduceMotion);
  const arrive = useRef(onArrive);
  arrive.current = onArrive;

  useEffect(() => {
    const m = new maplibregl.Map({
      container: container.current!,
      style: bundledStyle(true),
      center: HOME.center,
      zoom: HOME.zoom,
      attributionControl: { compact: true, customAttribution: "Natural Earth" },
      renderWorldCopies: false,
    });
    m.setPadding({ left: PADDING, top: 0, right: 0, bottom: 0 });
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
      el.innerHTML = `<span class="pin-dot"></span><span class="pin-label">${shortName(s.name)}</span>`;
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
  }, [target, sites]);

  // MapLibre forces position: relative on its container, so the sizing lives on a wrapper.
  return (
    <div className="globe-wrap">
      <div ref={container} className="globe" aria-label="Globe showing landfills in Australia and New Zealand" />
      <CurrencyAnchor />
    </div>
  );
}
