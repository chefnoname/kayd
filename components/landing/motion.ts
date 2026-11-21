/** Attribute set on <html> while a language switch is loading. */
export const LANG_SWITCHING_ATTR = "data-kayd-lang-switching";

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}
