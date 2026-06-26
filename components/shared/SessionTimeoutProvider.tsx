"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { clearOrganisationCache } from "@/lib/org";
import {
  SESSION_TIMEOUT_MINUTES,
  SESSION_WARNING_MINUTES,
} from "@/lib/constants";
import styles from "./SessionTimeoutProvider.module.css";

/* ------------------------------------------------------------------ */
/*  Context (exposed so children can reset the timer on major actions) */
/* ------------------------------------------------------------------ */
interface SessionTimeoutContextValue {
  /** Call to manually reset the inactivity timer. */
  resetTimer: () => void;
}

const SessionTimeoutContext = createContext<SessionTimeoutContextValue>({
  resetTimer: () => {},
});

export const useSessionTimeout = () => useContext(SessionTimeoutContext);

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/** Milliseconds until the next local midnight (00:00:00.000). */
function msUntilMidnight(): number {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return midnight.getTime() - now.getTime();
}

/** Session keys to clear on logout so rate gate / warning modals re-fire. */
const SESSION_KEYS_TO_CLEAR = [
  "rateGateCleared",
  "highBalanceWarningShown",
] as const;

const ACTIVITY_EVENTS: (keyof DocumentEventMap)[] = [
  "mousemove",
  "mousedown",
  "keydown",
  "scroll",
  "touchstart",
];

/* ------------------------------------------------------------------ */
/*  Provider                                                           */
/* ------------------------------------------------------------------ */

export function SessionTimeoutProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const supabase = createClient();

  // Effective timeout (may be overridden by org setting)
  const timeoutMinutesRef = useRef(SESSION_TIMEOUT_MINUTES);
  const warningMinutesRef = useRef(SESSION_WARNING_MINUTES);

  // Timers
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const logoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const midnightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Warning banner state
  const [showWarning, setShowWarning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);

  // Prevent logout from firing multiple times
  const loggingOutRef = useRef(false);

  /* ---------------------------------------------------------------- */
  /*  Logout                                                           */
  /* ---------------------------------------------------------------- */

  const performLogout = useCallback(async () => {
    if (loggingOutRef.current) return;
    loggingOutRef.current = true;

    // Clear session keys so rate gate re-fires on next login
    SESSION_KEYS_TO_CLEAR.forEach((k) => sessionStorage.removeItem(k));

    await supabase.auth.signOut();
    clearOrganisationCache();
    router.push("/login");
    router.refresh();
  }, [supabase, router]);

  /* ---------------------------------------------------------------- */
  /*  Timer management                                                 */
  /* ---------------------------------------------------------------- */

  const clearAllTimers = useCallback(() => {
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    warningTimerRef.current = null;
    logoutTimerRef.current = null;
    countdownIntervalRef.current = null;
  }, []);

  const resetTimer = useCallback(() => {
    if (loggingOutRef.current) return;

    clearAllTimers();
    setShowWarning(false);

    const timeoutMs = timeoutMinutesRef.current * 60 * 1000;
    const warningMs = warningMinutesRef.current * 60 * 1000;
    const warningAtMs = timeoutMs - warningMs;

    // Schedule warning banner
    warningTimerRef.current = setTimeout(() => {
      const warningSecs = Math.round(warningMs / 1000);
      setSecondsLeft(warningSecs);
      setShowWarning(true);

      // Tick every second
      countdownIntervalRef.current = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) return 0;
          return prev - 1;
        });
      }, 1000);
    }, warningAtMs);

    // Schedule hard logout
    logoutTimerRef.current = setTimeout(() => {
      performLogout();
    }, timeoutMs);
  }, [clearAllTimers, performLogout]);

  /** "Stay Logged In" — reset everything. */
  const handleStay = useCallback(() => {
    setShowWarning(false);
    resetTimer();
  }, [resetTimer]);

  /* ---------------------------------------------------------------- */
  /*  Fetch org-level timeout override on mount                        */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    let cancelled = false;

    async function fetchOrgTimeout() {
      try {
        const res = await fetch("/api/org/session-timeout");
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && typeof data.session_timeout_minutes === "number") {
          timeoutMinutesRef.current = data.session_timeout_minutes;
          // Scale warning proportionally but cap at 5 min
          warningMinutesRef.current = Math.min(
            data.session_timeout_minutes * 0.1,
            SESSION_WARNING_MINUTES
          );
        }
      } catch {
        // Fallback to constants — already set
      }
      // Start timers after we know the effective timeout
      if (!cancelled) resetTimer();
    }

    fetchOrgTimeout();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------------------------------------------------------------- */
  /*  Activity listeners                                               */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    // Throttle: only reset timer at most once per 30 seconds on activity
    let lastActivity = Date.now();
    const THROTTLE_MS = 30_000;

    function onActivity() {
      const now = Date.now();
      if (now - lastActivity < THROTTLE_MS) return;
      lastActivity = now;
      resetTimer();
    }

    ACTIVITY_EVENTS.forEach((evt) =>
      document.addEventListener(evt, onActivity, { passive: true })
    );

    return () => {
      ACTIVITY_EVENTS.forEach((evt) =>
        document.removeEventListener(evt, onActivity)
      );
    };
  }, [resetTimer]);

  /* ---------------------------------------------------------------- */
  /*  Midnight rollover — hard logout at 00:00 local time              */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    function scheduleMidnight() {
      if (midnightTimerRef.current) clearTimeout(midnightTimerRef.current);
      midnightTimerRef.current = setTimeout(() => {
        performLogout();
      }, msUntilMidnight());
    }

    scheduleMidnight();

    // Re-schedule if tab was suspended and wakes up after midnight
    function onVisibility() {
      if (document.visibilityState === "visible") {
        // If we're past midnight the timeout will be ~24h, but if the
        // date rolled over while hidden, ms will be very large. Check
        // if the current date differs from when we set the timer.
        scheduleMidnight();
      }
    }
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      if (midnightTimerRef.current) clearTimeout(midnightTimerRef.current);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [performLogout]);

  /* ---------------------------------------------------------------- */
  /*  Cleanup on unmount                                               */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    return () => clearAllTimers();
  }, [clearAllTimers]);

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const display =
    minutes > 0
      ? `${minutes}:${seconds.toString().padStart(2, "0")}`
      : `${seconds}s`;

  return (
    <SessionTimeoutContext.Provider value={{ resetTimer }}>
      {showWarning && (
        <div className={styles.banner} role="alert">
          <span className={styles.bannerText}>
            Session expiring in{" "}
            <span className={styles.countdown}>{display}</span>
          </span>
          <button className={styles.stayBtn} onClick={handleStay}>
            Stay Logged In
          </button>
        </div>
      )}
      {children}
    </SessionTimeoutContext.Provider>
  );
}
