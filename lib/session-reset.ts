"use client";

import { clearOrganisationCache } from "@/lib/org";

/**
 * Wipe everything the browser holds for the current login, then do a full
 * page load to `path`.
 *
 * A soft `router.push` keeps the JS heap alive: React state, Jotai atoms,
 * the Next.js router cache and in-flight requests from the previous login
 * can all paint into the next one. A full navigation drops all of it, so a
 * new or different account can never see the previous account's data.
 *
 * Call this whenever the signed-in identity changes: sign-in, sign-up,
 * sign-out, session timeout, invite acceptance.
 */
export function resetToPath(path: string): void {
  clearOrganisationCache();
  try {
    window.sessionStorage.clear();
  } catch {
    // Storage can be blocked (private mode); the full reload still wipes memory.
  }
  window.location.replace(path);
}
