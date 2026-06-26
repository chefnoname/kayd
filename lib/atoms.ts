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
