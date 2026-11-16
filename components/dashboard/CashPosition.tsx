"use client";

import { formatCurrency, formatLongDate } from "@/lib/utils";
import { EditableStatCard } from "./EditableStatCard";
import styles from "./CashPosition.module.css";

interface CashPositionProps {
  cashInSafeGBP: number;
  openingGBP: number;
  yesterday: Date;
  collectedTodayGBP: number;
  depositsToday: number;
  agentDebtGBP: number;
  agentDebtUSD: number;
  owingAgents: number;
  onSaveCashInSafe: (next: number) => Promise<void>;
}

function safeNote(cashInSafeGBP: number, openingGBP: number): string {
  const diff = Math.round((cashInSafeGBP - openingGBP) * 100) / 100;
  if (Math.abs(diff) < 0.005) return "Same as this morning's opening balance";
  return `${formatCurrency(Math.abs(diff), "GBP")} ${
    diff > 0 ? "more" : "less"
  } than this morning's opening balance`;
}

/** Today's cash position: one band, led by the cash in the safe. */
export function CashPosition({
  cashInSafeGBP,
  openingGBP,
  yesterday,
  collectedTodayGBP,
  depositsToday,
  agentDebtGBP,
  agentDebtUSD,
  owingAgents,
  onSaveCashInSafe,
}: CashPositionProps) {
  return (
    <section className={styles.band} aria-label="Today's cash position">
      <div className={styles.lead}>
        <EditableStatCard
          variant="hero"
          label="Cash in safe"
          value={cashInSafeGBP}
          currency="GBP"
          editable
          note={safeNote(cashInSafeGBP, openingGBP)}
          onSave={onSaveCashInSafe}
        />
      </div>
      <div className={styles.cell}>
        <span className={styles.label}>Opening balance</span>
        <span className={styles.value}>{formatCurrency(openingGBP, "GBP")}</span>
        <span className={styles.note}>
          Carried from {formatLongDate(yesterday)}
        </span>
      </div>
      <div className={styles.cell}>
        <span className={styles.label}>Collected today</span>
        <span className={styles.value}>
          {formatCurrency(collectedTodayGBP, "GBP")}
        </span>
        <span className={styles.note}>
          {depositsToday === 0
            ? "No agent deposits yet"
            : `${depositsToday} agent deposit${depositsToday === 1 ? "" : "s"}`}
        </span>
      </div>
      <div className={styles.cell}>
        <span className={styles.label}>Agents owe</span>
        <span
          className={`${styles.value} ${agentDebtUSD > 0 ? styles.debt : ""}`}
        >
          {formatCurrency(agentDebtGBP, "GBP")}
        </span>
        <span className={styles.note}>
          {owingAgents === 0
            ? "No agent owes anything"
            : `${formatCurrency(agentDebtUSD, "USD")} across ${owingAgents} agent${
                owingAgents === 1 ? "" : "s"
              }`}
        </span>
      </div>
    </section>
  );
}
