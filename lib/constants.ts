/** Agents with balance_usd at or above this value trigger a warning popup. */
export const UNCOLLECTED_BALANCE_THRESHOLD = 10000;

/**
 * Collections older than this many hours with no receipt confirmation
 * trigger the follow-up popup on dashboard load.
 *
 * UAT:        0.167  (~10 minutes)
 * Production: 72     (3 days)
 *
 * Change this single value to switch between UAT and production timing.
 */
export const COLLECTION_FOLLOWUP_HOURS = 0; // Set to 0.167 for UAT (10 min), 72 for production (3 days)
