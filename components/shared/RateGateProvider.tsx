"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { RATE_GATE_MODE } from "@/lib/constants";
import { createClient } from "@/lib/supabase";
import { getOrganisationId } from "@/lib/org";
import { toDateString } from "@/lib/utils";
import { RateGateModal } from "./RateGateModal";

interface RateGateContextValue {
  /** True once the user has submitted (or gate was skipped in daily mode). */
  gateCleared: boolean;
  /** Send rate from rate_entries (set on submission or fetched on skip). */
  sendRate: number | null;
  /** Receive rate from rate_entries (set on submission or fetched on skip). */
  receiveRate: number | null;
}

const RateGateContext = createContext<RateGateContextValue>({
  gateCleared: false,
  sendRate: null,
  receiveRate: null,
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
  const [sendRate, setSendRate] = useState<number | null>(null);
  const [receiveRate, setReceiveRate] = useState<number | null>(null);

  /** Fetch today's latest rate_entries row from Supabase. */
  const fetchRates = useCallback(async () => {
    const supabase = createClient();
    const orgId = await getOrganisationId();
    if (!orgId) return;
    const { data } = await supabase
      .from("rate_entries")
      .select("send_rate, receive_rate")
      .eq("organisation_id", orgId)
      .eq("date", toDateString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) {
      setSendRate(Number(data.send_rate));
      setReceiveRate(Number(data.receive_rate));
    }
  }, []);

  const checkGate = useCallback(async () => {
    // If already cleared this session (client navigation), skip the fetch.
    if (sessionStorage.getItem(SESSION_KEY) === "true") {
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

  function handleSubmitted(submittedSendRate: number, submittedReceiveRate: number) {
    sessionStorage.setItem(SESSION_KEY, "true");
    setSendRate(submittedSendRate);
    setReceiveRate(submittedReceiveRate);
    setGateCleared(true);
  }

  // While checking, render nothing (brief flash).
  if (checking) return null;

  return (
    <RateGateContext.Provider value={{ gateCleared, sendRate, receiveRate }}>
      <RateGateModal open={!gateCleared} onSubmitted={handleSubmitted} />
      {children}
    </RateGateContext.Provider>
  );
}
