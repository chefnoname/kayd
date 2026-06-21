/** Agents with balance_usd at or above this value trigger a warning popup. */
export const UNCOLLECTED_BALANCE_THRESHOLD = 10000;

/** How often (ms) to poll rate_entries for updated send/receive rates. */
export const RATE_REFRESH_INTERVAL_MS = 60_000;

/**
 * RATE_GATE_MODE controls when the mandatory rate-entry modal appears.
 *
 * 'login'  — modal fires on every login regardless of whether rates
 *            were already entered today. Use this for UAT testing.
 * 'daily'  — modal fires once per calendar day. If rates have already
 *            been submitted today, the gate is skipped. Use for production.
 *
 * This is a one-line change to switch between modes.
 */
export const RATE_GATE_MODE: "login" | "daily" = "login";
