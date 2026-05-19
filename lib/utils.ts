import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Tailwind class merge helper used by shadcn/ui components.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a number as GBP currency.
 */
export function formatGBP(amount: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format a number as USD currency.
 */
export function formatUSD(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount);
}

/**
 * Convert GBP to USD using a given rate.
 */
export function gbpToUsd(gbp: number, rate: number): number {
  return Math.round(gbp * rate * 100) / 100;
}

/**
 * Convert GBP to USD using a given rate. Shared helper used across
 * every screen that does currency conversion.
 */
export function convertGBPtoUSD(amountGBP: number, rate: number): number {
  if (!Number.isFinite(amountGBP) || !Number.isFinite(rate)) return 0;
  return Math.round(amountGBP * rate * 100) / 100;
}

/**
 * Format a number in the given currency. Shared helper used across
 * every screen that displays money.
 */
export function formatCurrency(
  amount: number,
  currency: "GBP" | "USD"
): string {
  const locale = currency === "GBP" ? "en-GB" : "en-US";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

/**
 * Convert USD to GBP using a given rate (gbp_to_usd rate).
 */
export function usdToGbp(usd: number, rate: number): number {
  if (rate === 0) return 0;
  return Math.round((usd / rate) * 100) / 100;
}

/**
 * Format a date as YYYY-MM-DD (date column in Postgres).
 */
export function toDateString(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Pretty long-form date for headers (e.g. "Mon, 19 May 2026").
 */
export function formatLongDate(d: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

export interface SettlementCalculation {
  usdEquivalent: number;
  newBalance: number;
  isOverpayment: boolean;
  isFullSettlement: boolean;
}

/**
 * Core settlement maths. All values rounded to 2 dp.
 *
 * - `usdEquivalent` = `receivedGBP * rate`
 * - `newBalance`    = `agentBalanceUSD - usdEquivalent` (may go negative on overpayment)
 * - `isOverpayment` = payment strictly exceeds the balance
 * - `isFullSettlement` = payment exactly clears the balance (within 1¢)
 */
export function calculateSettlement(
  agentBalanceUSD: number,
  receivedGBP: number,
  rate: number
): SettlementCalculation {
  const usdEquivalent = convertGBPtoUSD(receivedGBP, rate);
  const newBalance = Math.round((agentBalanceUSD - usdEquivalent) * 100) / 100;
  const isFullSettlement = Math.abs(newBalance) < 0.005;
  const isOverpayment = newBalance < -0.005;
  return {
    usdEquivalent,
    newBalance,
    isOverpayment,
    isFullSettlement,
  };
}

export interface ReconciliationResult {
  expectedClosingGBP: number;
  formula: string;
}

/**
 * Compute the expected closing cash position for the day.
 *
 *   expected = opening + cashInSafe + collections - totalAgentDebt
 *
 * Returns a human-readable formula alongside the figure.
 */
export function reconcileDay(
  openingGBP: number,
  cashInSafeGBP: number,
  collectionsTodayGBP: number,
  totalAgentDebtGBP: number
): ReconciliationResult {
  const expected =
    Math.round(
      (openingGBP + cashInSafeGBP + collectionsTodayGBP - totalAgentDebtGBP) *
        100
    ) / 100;

  const formula = `${formatCurrency(openingGBP, "GBP")} + ${formatCurrency(
    cashInSafeGBP,
    "GBP"
  )} + ${formatCurrency(collectionsTodayGBP, "GBP")} − ${formatCurrency(
    totalAgentDebtGBP,
    "GBP"
  )} = ${formatCurrency(expected, "GBP")}`;

  return { expectedClosingGBP: expected, formula };
}

export interface DiscrepancyResult {
  amount: number;
  hasDiscrepancy: boolean;
  direction: "over" | "under" | "balanced";
}

/**
 * Compare expected vs actual cash. `amount` is always non-negative;
 * `direction` indicates whether actual is over, under, or balanced.
 * A 1p tolerance is applied.
 */
export function calculateDiscrepancy(
  expectedGBP: number,
  actualGBP: number
): DiscrepancyResult {
  const diff = Math.round((actualGBP - expectedGBP) * 100) / 100;
  const abs = Math.abs(diff);
  if (abs < 0.005) {
    return { amount: 0, hasDiscrepancy: false, direction: "balanced" };
  }
  return {
    amount: abs,
    hasDiscrepancy: true,
    direction: diff > 0 ? "over" : "under",
  };
}

/**
 * Whole-day difference between today (UTC) and the given ISO date string.
 * Returns 0 if `date` is today or in the future. Returns a large number
 * (>= 7) when `date` is null/invalid so the UI treats it as overdue.
 */
export function daysSince(date: string | null | undefined): number {
  if (!date) return Number.POSITIVE_INFINITY;
  const then = new Date(`${date.slice(0, 10)}T00:00:00Z`).getTime();
  if (!Number.isFinite(then)) return Number.POSITIVE_INFINITY;
  const today = new Date(toDateString()).getTime();
  const diff = Math.floor((today - then) / 86_400_000);
  return diff < 0 ? 0 : diff;
}

export type LocationStatus = "green" | "amber" | "red";

/**
 * Map a "days since last collection" value to a status colour.
 *   0–3 days  → green
 *   4–5 days  → amber
 *   6+ days   → red (overdue)
 */
export function getLocationStatus(days: number): LocationStatus {
  if (days <= 3) return "green";
  if (days <= 5) return "amber";
  return "red";
}
