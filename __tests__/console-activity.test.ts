import { describe, test, expect } from "vitest";
import {
  describeEvent,
  csvCell,
  formatMoney,
  filterForType,
  type ActivityRow,
} from "../lib/console/activity";
import { formatDateTime } from "../lib/console/format";

function row(partial: Partial<ActivityRow>): ActivityRow {
  return {
    id: 1,
    organisation_id: "org",
    actor_id: "user",
    action: "insert",
    entity_type: "agent_deposits",
    entity_id: "x",
    old_data: null,
    new_data: null,
    created_at: "2026-11-23T14:40:00Z",
    ...partial,
  };
}

describe("describeEvent hides money unless amounts are shown", () => {
  const deposit = row({
    new_data: { agent_id: "a1", amount_received_gbp: 4800 },
  });
  const names = { agents: { a1: "Bashir Ahmed" } };

  test("hidden: no amount and no figure in the detail", () => {
    const e = describeEvent(deposit, false, names);
    expect(e.amount).toBeNull();
    expect(e.detail).toBe("Agent deposit recorded for Bashir Ahmed");
    expect(e.detail).not.toMatch(/\d/);
  });

  test("shown: amount formatted with symbol and two decimals", () => {
    expect(describeEvent(deposit, true, names).amount).toBe("£4,800.00");
  });

  test("edit hides old and new values unless shown", () => {
    const edit = row({
      action: "update",
      old_data: { agent_id: "a1", amount_received_gbp: 5200 },
      new_data: { agent_id: "a1", amount_received_gbp: 4800 },
    });
    const hidden = describeEvent(edit, false, names);
    expect(hidden.detail).toBe("Agent deposit edited for Bashir Ahmed (amount changed)");
    expect(hidden.amount).toBeNull();

    const shown = describeEvent(edit, true, names);
    expect(shown.detail).toContain("from £5,200.00 to £4,800.00");
    expect(shown.amount).toBe("−£400.00");
  });

  test("releasing an individual deposit is a withdrawal", () => {
    const release = row({
      entity_type: "individual_deposits",
      action: "update",
      old_data: { holder_name: "Amina", amount_usd: 800, status: "held" },
      new_data: { holder_name: "Amina", amount_usd: 800, status: "released", released_to: "Amina Said" },
    });
    const e = describeEvent(release, false);
    expect(e.label).toBe("Withdrawal");
    expect(e.detail).toBe("Individual deposit released to Amina Said");
    expect(e.amount).toBeNull();
    expect(describeEvent(release, true).amount).toBe("$800.00");
  });

  test("closing the day hides the discrepancy unless shown", () => {
    const close = row({
      entity_type: "daily_balances",
      action: "update",
      old_data: { date: "2026-11-22", is_closed: false, discrepancy: 0 },
      new_data: { date: "2026-11-22", is_closed: true, discrepancy: -20 },
    });
    expect(describeEvent(close, false).amount).toBeNull();
    expect(describeEvent(close, true).amount).toBe("Discrepancy −£20.00");
  });

  test("rates are always shown to four decimals", () => {
    const rate = row({ entity_type: "daily_rates", new_data: { gbp_to_usd: 1.26843 } });
    expect(describeEvent(rate, false).detail).toBe("GBP→USD rate set to 1.2684");
  });

  test("sign-ins", () => {
    expect(describeEvent(row({ action: "sign_in", entity_type: "auth" }), false).label).toBe("Signed in");
  });
});

describe("helpers", () => {
  test("formatMoney", () => {
    expect(formatMoney(150000, "USD")).toBe("$150,000.00");
    expect(formatMoney(-20, "GBP")).toBe("−£20.00");
    expect(formatMoney(null, "GBP")).toBeNull();
  });

  test("csvCell quotes and neutralises formulas", () => {
    expect(csvCell('a,"b"')).toBe('"a,""b"""');
    expect(csvCell("=HYPERLINK(1)")).toBe("'=HYPERLINK(1)");
    expect(csvCell(null)).toBe("");
  });

  test("filterForType", () => {
    expect(filterForType("edits")).toEqual({ actions: ["update", "delete"] });
    expect(filterForType("money").entityTypes).toContain("individual_deposits");
  });

  test("formatDateTime uses UK time and 24-hour clock", () => {
    expect(formatDateTime("2026-11-23T14:40:00Z")).toBe("Mon, 23 Nov 2026, 14:40");
    expect(formatDateTime("2026-07-01T08:05:00Z")).toBe("Wed, 1 Jul 2026, 09:05");
    expect(formatDateTime(null)).toBe("Never");
  });
});
