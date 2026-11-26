/** Date and time formatting for the console: "Mon, 16 Nov 2026, 08:42", UK time. */

const DATE = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Europe/London",
});

const TIME = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "Europe/London",
});

export function formatDate(value: string | null | undefined): string {
  if (!value) return "None";
  const d = new Date(value.length === 10 ? `${value}T12:00:00Z` : value);
  if (Number.isNaN(d.getTime())) return "None";
  return DATE.format(d);
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "Never";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "Never";
  return `${DATE.format(d)}, ${TIME.format(d)}`;
}

/** Whole days between a timestamp and now. */
export function daysAgo(value: string | null | undefined, now = new Date()): number | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return Math.floor((now.getTime() - d.getTime()) / 86_400_000);
}
