"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase";
import { resetToPath } from "@/lib/session-reset";

/**
 * Renders the signed-in app only once the browser has confirmed who is
 * signed in, and tears the page down the moment that changes.
 *
 * - Children render only after `getUser()` returns a user (verified with the
 *   auth server, not just read from a cookie).
 * - If the user signs out, or a different user signs in (this tab or another
 *   tab), the page does a full reload so nothing from the old login survives.
 * - If the browser restores the page from its back/forward cache, or the tab
 *   regains focus, the user is checked again.
 */
export function AuthBoundary({ children }: { children: React.ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const userIdRef = useRef<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    async function verify() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled) return;
      if (!user) {
        resetToPath("/login");
        return;
      }
      if (userIdRef.current && userIdRef.current !== user.id) {
        resetToPath("/dashboard");
        return;
      }
      userIdRef.current = user.id;
      setUserId(user.id);
    }

    void verify();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      const nextId = session?.user?.id ?? null;
      if (event === "SIGNED_OUT" || !nextId) {
        resetToPath("/login");
        return;
      }
      if (userIdRef.current && nextId !== userIdRef.current) {
        resetToPath("/dashboard");
      }
    });

    function onPageShow(e: PageTransitionEvent) {
      // Restored from the back/forward cache: never trust the old paint.
      if (e.persisted) window.location.reload();
    }
    function onVisible() {
      if (document.visibilityState === "visible") void verify();
    }

    window.addEventListener("pageshow", onPageShow);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      subscription.unsubscribe();
      window.removeEventListener("pageshow", onPageShow);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  if (!userId) return null;

  // Keyed by user id so no component state can carry across identities.
  return <div key={userId} style={{ display: "contents" }}>{children}</div>;
}
