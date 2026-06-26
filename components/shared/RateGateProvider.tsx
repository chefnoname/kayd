"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useSetAtom } from "jotai";
import { RATE_GATE_MODE } from "@/lib/constants";
import { createClient } from "@/lib/supabase";
import { getOrganisationId } from "@/lib/org";
import { toDateString } from "@/lib/utils";
import { rateAtom } from "@/lib/atoms";
import { RateGateModal } from "./RateGateModal";

interface RateGateContextValue {
  /** True once the user has submitted (or gate was skipped in daily mode). */
  gateCleared: boolean;
}

const RateGateContext = createContext<RateGateContextValue>({
  gateCleared: false,
});

export function useRateGate() {
  return useContext(RateGateContext);
}

/**
 * sessionStorage key — set after successful submission so the modal
 * doesn't re-fire on client-side navigations within the same session.
 * Cleared on logout (AppHeader handles that).
 */
const SESSION_KEY = "rateGateCleared";

export function RateGateProvider({ children }: { children: React.ReactNode }) {
  const [gateCleared, setGateCleared] = useState(false);
  const [checking, setChecking] = useState(true);
  const setRates = useSetAtom(rateAtom);

  /** Track the date when the gate was last cleared so we detect day rollover. */
  const gateClearedDateRef = useRef<string | null>(null);

  /** Fetch today's latest rate_entries row and push into the atom. */
  const fetchRates = useCallback(async () => {
    const supabase = createClient();
    const orgId = await getOrganisationId();
    if (!orgId) return;
    const { data } = await supabase
      .from("rate_entries")
      .select("send_rate, receive_rate, created_at")
      .eq("organisation_id", orgId)
      .eq("date", toDateString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) {
      setRates({
        sendRate: Number(data.send_rate),
        receiveRate: Number(data.receive_rate),
        timestamp: data.created_at ?? null,
      });
    }
  }, [setRates]);

  const checkGate = useCallback(async () => {
    // If already cleared this session (client navigation), skip the fetch.
    if (sessionStorage.getItem(SESSION_KEY) === "true") {
      gateClearedDateRef.current = toDateString();
      setGateCleared(true);
      await fetchRates();
      setChecking(false);
      return;
    }

    // In 'login' mode, gate always fires (never skip).
    if (RATE_GATE_MODE === "login") {
      setChecking(false);
      return;
    }

    // In 'daily' mode, check if rates were already submitted today.
    try {
      const res = await fetch("/api/rates/gate");
      if (res.ok) {
        const data = await res.json();
        if (data.submitted) {
          sessionStorage.setItem(SESSION_KEY, "true");
          gateClearedDateRef.current = toDateString();
          setGateCleared(true);
          await fetchRates();
        }
      }
    } catch {
      // Network error — show the gate to be safe.
    } finally {
      setChecking(false);
    }
  }, [fetchRates]);

  useEffect(() => {
    checkGate();
  }, [checkGate]);

  /**
   * HAWALA-07: On tab resume, re-check if the calendar date has rolled over.
   * If it has, clear the session flag and re-fire the gate so the user must
   * enter today's rates before continuing.
   */
  useEffect(() => {
    function onVisibilityChange() {
      if (document.visibilityState !== "visible") return;

      const today = toDateString();
      if (gateClearedDateRef.current && gateClearedDateRef.current !== today) {
        // Day has changed — invalidate the gate
        sessionStorage.removeItem(SESSION_KEY);
        gateClearedDateRef.current = null;
        setGateCleared(false);
        setChecking(true);
        checkGate();
      }
    }

    document.addEventListener("visibilitychange", onVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [checkGate]);

  function handleSubmitted(submittedSendRate: number, submittedReceiveRate: number) {
    sessionStorage.setItem(SESSION_KEY, "true");
    gateClearedDateRef.current = toDateString();
    setRates({
      sendRate: submittedSendRate,
      receiveRate: submittedReceiveRate,
      timestamp: new Date().toISOString(),
    });
    setGateCleared(true);
  }

  // While checking, render nothing (brief flash).
  if (checking) return null;

  return (
    <RateGateContext.Provider value={{ gateCleared }}>
      <RateGateModal open={!gateCleared} onSubmitted={handleSubmitted} />
      {children}
    </RateGateContext.Provider>
  );
}
