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
