import { atom } from "jotai";

export interface RateState {
  sendRate: number | null;
  receiveRate: number | null;
  timestamp: string | null;
}

/** Shared rate state — written by RateGateProvider + AppHeader polling, read by Sidebar + AppHeader. */
export const rateAtom = atom<RateState>({
  sendRate: null,
  receiveRate: null,
  timestamp: null,
});

export interface AttentionAgent {
  id: string;
  name: string;
  balance_usd: number;
}

export interface AttentionOffice {
  id: string;
  name: string;
  cash_held_gbp: number;
  /** null = no collection has ever been logged */
  days: number | null;
}

export interface AttentionState {
  /** Active agents with a balance above zero. */
  owingCount: number;
  /** Active agents at or above the uncollected-balance threshold. */
  highBalanceAgents: AttentionAgent[];
  /** Offices whose last collection is overdue (red status). */
  overdueOffices: AttentionOffice[];
  loaded: boolean;
}

/** Things that need action today — written by AppHeader, read by Sidebar + dashboard. */
export const attentionAtom = atom<AttentionState>({
  owingCount: 0,
  highBalanceAgents: [],
  overdueOffices: [],
  loaded: false,
});
