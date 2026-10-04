import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";

const WIDTH = 300;
const GUTTER = 12;

/**
 * A small eye icon that reveals extra detail on hover, keyboard focus or tap.
 * The bubble is fixed-positioned and clamped to the viewport, and closes on scroll or Escape.
 */
export function Info({ label = "More information", children }: { label?: string; children: ReactNode }) {
  const id = useId();
  const btn = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; below: boolean } | null>(null);

  const place = useCallback(() => {
    const r = btn.current?.getBoundingClientRect();
    if (!r) return;
    const width = Math.min(WIDTH, window.innerWidth - GUTTER * 2);
    const left = Math.min(Math.max(GUTTER, r.left + r.width / 2 - width / 2), window.innerWidth - width - GUTTER);
    const below = r.bottom + 180 < window.innerHeight || r.top < 200;
    setPos({ top: below ? r.bottom + 8 : r.top - 8, left, below });
  }, []);

  useLayoutEffect(() => {
    if (open) place();
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    const close = () => {
      setOpen(false);
      setPinned(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    const onDown = (e: PointerEvent) => !btn.current?.contains(e.target as Node) && close();
    window.addEventListener("scroll", close, { passive: true, capture: true });
    window.addEventListener("resize", close);
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("scroll", close, { capture: true });
      window.removeEventListener("resize", close);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown);
    };
  }, [open]);

  return (
    <span className="info">
      <button
        ref={btn}
        type="button"
        className="info-btn"
        aria-label={label}
        aria-expanded={open}
        aria-describedby={open ? id : undefined}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => !pinned && setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => !pinned && setOpen(false)}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setPinned((p) => !p);
          setOpen((o) => !(o && pinned));
        }}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M1.5 12S5.5 4.5 12 4.5 22.5 12 22.5 12 18.5 19.5 12 19.5 1.5 12 1.5 12Z" />
          <circle cx="12" cy="12" r="3.2" />
        </svg>
      </button>
      {open && pos && (
        <span
          role="tooltip"
          id={id}
          className={`info-pop ${pos.below ? "below" : "above"}`}
          style={{ top: pos.top, left: pos.left, width: Math.min(WIDTH, window.innerWidth - GUTTER * 2) }}
        >
          {children}
        </span>
      )}
    </span>
  );
}
