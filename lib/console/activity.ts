/**
 * Turns raw activity_log rows into readable lines for the Kayd console.
 *
 * Money stays hidden unless `showAmounts` is true: the amount column comes
 * back as null and details never mention a figure. Exchange rates are not
 * client money and are always shown.
 */

export type ActivityRow = {
  id: number;
  organisation_id: string | null;
  actor_id: string | null;
  action: "insert" | "update" | "delete" | "sign_in" | string;
  entity_type: string;
  entity_id: string | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  created_at: string;
};

export type Tone = "money" | "edit" | "delete" | "neutral";

export type DescribedEvent = {
  label: string;
  detail: string;
  amount: string | null;
  tone: Tone;
};

export type ActivityType =
  | "money"
  | "edits"
  | "rates"
  | "eod"
  | "agents"
  | "people"
  | "locations"
  | "sign_in";

export const ACTIVITY_TYPES: { value: ActivityType; label: string }[] = [
  { value: "money", label: "Deposits and withdrawals" },
  { value: "edits", label: "Edits and deletes" },
  { value: "rates", label: "Rates" },
  { value: "eod", label: "End of day" },
  { value: "agents", label: "Agents" },
  { value: "people", label: "People" },
  { value: "locations", label: "Locations" },
  { value: "sign_in", label: "Sign-ins" },
];

const MONEY_TABLES = [
  "agent_deposits",
  "individual_deposits",
  "collection_pickups",
  "cit_collections",
];

/** Filter to apply to activity_log for a chosen type. */
export function filterForType(
  type: ActivityType
): { entityTypes?: string[]; actions?: string[] } {
  switch (type) {
    case "money":
      return { entityTypes: MONEY_TABLES };
    case "edits":
      return { actions: ["update", "delete"] };
    case "rates":
      return { entityTypes: ["daily_rates", "rate_entries"] };
    case "eod":
      return { entityTypes: ["daily_balances"] };
    case "agents":
      return { entityTypes: ["agents"] };
    case "people":
      return { entityTypes: ["staff_users"] };
    case "locations":
      return { entityTypes: ["regional_offices"] };
    case "sign_in":
      return { actions: ["sign_in"] };
  }
}

export function isActivityType(v: unknown): v is ActivityType {
  return ACTIVITY_TYPES.some((t) => t.value === v);
}

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function str(v: unknown): string {
  return typeof v === "string" ? v : v === null || v === undefined ? "" : String(v);
}

export function formatMoney(value: unknown, currency: "GBP" | "USD"): string | null {
  const n = num(value);
  if (n === null) return null;
  const symbol = currency === "GBP" ? "£" : "$";
  const abs = Math.abs(n).toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${n < 0 ? "−" : ""}${symbol}${abs}`;
}

function formatRate(value: unknown): string | null {
  const n = num(value);
  return n === null ? null : n.toFixed(4);
}

function signed(diff: number, currency: "GBP" | "USD"): string {
  const s = formatMoney(Math.abs(diff), currency) ?? "";
  return `${diff >= 0 ? "+" : "−"}${s}`;
}

/** The money field for each money table, and its currency. */
const AMOUNT_FIELD: Record<string, [string, "GBP" | "USD"]> = {
  agent_deposits: ["amount_received_gbp", "GBP"],
  individual_deposits: ["amount_usd", "USD"],
  collection_pickups: ["amount_gbp", "GBP"],
  cit_collections: ["amount_usd", "USD"],
};

const NOUN: Record<string, string> = {
  agent_deposits: "Agent deposit",
  individual_deposits: "Individual deposit",
  collection_pickups: "Collection",
  cit_collections: "Cash-in-transit collection",
  agents: "Agent",
  regional_offices: "Location",
  staff_users: "Person",
};

export type NameLookup = {
  agents?: Record<string, string>;
  offices?: Record<string, string>;
};

function subjectFor(
  table: string,
  row: Record<string, unknown>,
  names: NameLookup
): string {
  switch (table) {
    case "agent_deposits": {
      const name = names.agents?.[str(row.agent_id)];
      return name ? `for ${name}` : "";
    }
    case "individual_deposits":
      return row.holder_name ? `for ${str(row.holder_name)}` : "";
    case "collection_pickups": {
      const office = names.offices?.[str(row.office_id)];
      return office ? `at ${office}` : "";
    }
    case "cit_collections":
      return row.branch_name ? `from ${str(row.branch_name)}` : "";
    default:
      return "";
  }
}

function join(...parts: string[]): string {
  return parts.filter(Boolean).join(" ");
}

export function describeEvent(
  row: ActivityRow,
  showAmounts: boolean,
  names: NameLookup = {}
): DescribedEvent {
  const oldD = row.old_data ?? {};
  const newD = row.new_data ?? {};
  const cur = row.action === "delete" ? oldD : newD;
  const table = row.entity_type;

  if (row.action === "sign_in") {
    return { label: "Signed in", detail: "", amount: null, tone: "neutral" };
  }

  // Money tables
  if (table in AMOUNT_FIELD) {
    const [field, currency] = AMOUNT_FIELD[table];
    const noun = NOUN[table];
    const subject = subjectFor(table, cur, names);

    if (row.action === "insert") {
      return {
        label: "Deposit",
        detail: join(`${noun} recorded`, subject),
        amount: showAmounts ? formatMoney(newD[field], currency) : null,
        tone: "money",
      };
    }
    if (row.action === "delete") {
      return {
        label: "Deleted",
        detail: join(`${noun} deleted`, subject),
        amount: showAmounts ? formatMoney(oldD[field], currency) : null,
        tone: "delete",
      };
    }
    // update
    if (
      table === "individual_deposits" &&
      oldD.status !== "released" &&
      newD.status === "released"
    ) {
      return {
        label: "Withdrawal",
        detail: join(
          "Individual deposit released",
          newD.released_to ? `to ${str(newD.released_to)}` : subject
        ),
        amount: showAmounts ? formatMoney(newD[field], currency) : null,
        tone: "money",
      };
    }
    const before = num(oldD[field]);
    const after = num(newD[field]);
    const amountChanged = before !== null && after !== null && before !== after;
    let detail = join(`${noun} edited`, subject);
    if (amountChanged && showAmounts) {
      detail = join(
        detail,
        `from ${formatMoney(before, currency)} to ${formatMoney(after, currency)}`
      );
    } else if (amountChanged) {
      detail = join(detail, "(amount changed)");
    }
    return {
      label: "Edited",
      detail,
      amount: amountChanged && showAmounts ? signed(after! - before!, currency) : null,
      tone: "edit",
    };
  }

  if (table === "daily_rates") {
    return {
      label: row.action === "delete" ? "Deleted" : "Rate set",
      detail: `GBP→USD rate ${row.action === "delete" ? "removed" : "set to"} ${formatRate(cur.gbp_to_usd) ?? ""}`.trim(),
      amount: null,
      tone: row.action === "delete" ? "delete" : "neutral",
    };
  }

  if (table === "rate_entries") {
    return {
      label: "Rate set",
      detail: `Send rate ${formatRate(cur.send_rate) ?? "–"}, receive rate ${formatRate(cur.receive_rate) ?? "–"}`,
      amount: null,
      tone: "neutral",
    };
  }

  if (table === "daily_balances") {
    const day = str(cur.date);
    if (row.action === "insert") {
      return { label: "Day opened", detail: `Day started for ${day}`, amount: null, tone: "neutral" };
    }
    if (row.action === "delete") {
      return { label: "Deleted", detail: `Day record for ${day} deleted`, amount: null, tone: "delete" };
    }
    if (!oldD.is_closed && newD.is_closed) {
      const disc = num(newD.discrepancy);
      return {
        label: "Day closed",
        detail: `End of day closed for ${day}`,
        amount:
          showAmounts && disc !== null && disc !== 0
            ? `Discrepancy ${signed(disc, "GBP")}`
            : null,
        tone: "neutral",
      };
    }
    if (oldD.is_closed && !newD.is_closed) {
      return { label: "Day reopened", detail: `End of day reopened for ${day}`, amount: null, tone: "edit" };
    }
    return { label: "Edited", detail: `End-of-day figures edited for ${day}`, amount: null, tone: "edit" };
  }

  if (table === "staff_users") {
    const name = str(cur.name) || str(cur.email);
    if (row.action === "insert") return { label: "Person added", detail: name, amount: null, tone: "neutral" };
    if (row.action === "delete") return { label: "Person removed", detail: name, amount: null, tone: "delete" };
    const changes: string[] = [];
    if (oldD.role !== newD.role) changes.push(`role ${str(oldD.role)} → ${str(newD.role)}`);
    if (oldD.status !== newD.status) changes.push(`status ${str(oldD.status)} → ${str(newD.status)}`);
    if (!oldD.locked_at && newD.locked_at) changes.push("locked");
    if (oldD.locked_at && !newD.locked_at) changes.push("unlocked");
    return {
      label: "Person changed",
      detail: join(name, changes.length ? `: ${changes.join(", ")}` : ""),
      amount: null,
      tone: "edit",
    };
  }

  if (table === "agents" || table === "regional_offices") {
    const noun = NOUN[table];
    const name = str(cur.name);
    const verb = row.action === "insert" ? "added" : row.action === "delete" ? "removed" : "edited";
    return {
      label: `${noun} ${verb}`,
      detail: name,
      amount: null,
      tone: row.action === "delete" ? "delete" : row.action === "update" ? "edit" : "neutral",
    };
  }

  return {
    label: row.action,
    detail: table,
    amount: null,
    tone: "neutral",
  };
}

/** Plain-English label for each kayd_access_log action. */
export const ACCESS_ACTION_LABEL: Record<string, string> = {
  viewed_amounts: "Viewed amounts",
  exported: "Exported activity",
  sent_reset: "Sent reset link",
  signed_out: "Signed out of every device",
  locked: "Locked account",
  unlocked: "Unlocked account",
  suspended: "Suspended organisation",
  reactivated: "Reactivated organisation",
  subscription_updated: "Updated subscription",
  staff_invited: "Added Kayd staff",
  staff_removed: "Removed Kayd staff",
};

/** Quote a value for a CSV cell. */
export function csvCell(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value);
  // Neutralise spreadsheet formulas.
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}
