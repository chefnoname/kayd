"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { prefersReducedMotion } from "./motion";
import type { Locale } from "./types";

type LocaleFadeProps = {
  locale: Locale;
  className?: string;
  children: ReactNode;
};

/**
 * Wraps the page copy so a language switch feels like one smooth change:
 * CSS dims it while the new language loads (see LanguageToggle), and when the
 * new text arrives it settles in with a short fade and lift.
 */
export function LocaleFade({ locale, className, children }: LocaleFadeProps) {
  const ref = useRef<HTMLDivElement>(null);
  const previous = useRef(locale);

  useEffect(() => {
    if (previous.current === locale) return;
    previous.current = locale;

    const el = ref.current;
    if (!el || prefersReducedMotion() || typeof el.animate !== "function") return;

    el.animate(
      [
        { opacity: 0.4, transform: "translateY(6px)" },
        { opacity: 1, transform: "translateY(0)" },
      ],
      { duration: 360, easing: "cubic-bezier(0.22, 1, 0.36, 1)" }
    );
  }, [locale]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
