import { useLayoutEffect, useRef } from "react";

/** Reveal once on entry. Content stays visible if motion or observation is unavailable. */
export function useHomeReveal() {
  const root = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const element = root.current;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!element || motion.matches || typeof IntersectionObserver === "undefined") return;

    const targets = Array.from(element.querySelectorAll<HTMLElement>("[data-reveal]"));
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) reveal(entry.target as HTMLElement);
      }
    }, { threshold: 0.12, rootMargin: "0px 0px -24px 0px" });

    function reveal(target: HTMLElement) {
      target.dataset.revealState = "visible";
      observer.unobserve(target);
    }

    const onMotionChange = () => {
      if (!motion.matches) return;
      targets.forEach(reveal);
      observer.disconnect();
    };
    const onFocus = (event: FocusEvent) => {
      if (!(event.target instanceof Element)) return;
      const target = event.target.closest<HTMLElement>("[data-reveal]");
      if (target && element.contains(target)) reveal(target);
    };

    for (const target of targets) {
      target.dataset.revealState = "pending";
      observer.observe(target);
    }
    motion.addEventListener("change", onMotionChange);
    element.addEventListener("focusin", onFocus);

    return () => {
      observer.disconnect();
      motion.removeEventListener("change", onMotionChange);
      element.removeEventListener("focusin", onFocus);
      for (const target of targets) delete target.dataset.revealState;
    };
  }, []);

  return root;
}
