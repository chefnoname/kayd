"use client";

import { useEffect } from "react";
import { prefersReducedMotion } from "./motion";

/**
 * Fades `[data-reveal]` elements up as they scroll into view.
 *
 * Progressive enhancement: the server renders everything visible. On mount we
 * only hide elements that are still below the fold, so nothing on screen ever
 * flashes, and without JS (or with reduced motion) the page is unchanged.
 * Stagger an element with the `--reveal-delay` custom property.
 */
export function ScrollReveal() {
  useEffect(() => {
    if (prefersReducedMotion() || !("IntersectionObserver" in window)) return;

    const fold = window.innerHeight * 0.92;
    const targets = Array.from(
      document.querySelectorAll<HTMLElement>("[data-reveal]")
    ).filter((el) => el.getBoundingClientRect().top > fold);

    if (targets.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.setAttribute("data-reveal", "shown");
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 }
    );

    for (const el of targets) {
      el.setAttribute("data-reveal", "pending");
      observer.observe(el);
    }

    return () => {
      observer.disconnect();
      // Never leave content hidden if the page unmounts mid-scroll.
      for (const el of targets) el.setAttribute("data-reveal", "");
    };
  }, []);

  return null;
}
