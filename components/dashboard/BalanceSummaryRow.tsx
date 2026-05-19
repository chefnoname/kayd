"use client";

import { EditableStatCard } from "./EditableStatCard";
import styles from "./BalanceSummaryRow.module.css";

interface BalanceSummaryRowProps {
  systemLimitUSD: number;
  cashInSafeGBP: number;
  totalAgentDebtGBP: number;
  onSaveSystemLimit: (next: number) => Promise<void>;
  onSaveCashInSafe: (next: number) => Promise<void>;
}

export function BalanceSummaryRow({
  systemLimitUSD,
  cashInSafeGBP,
  totalAgentDebtGBP,
  onSaveSystemLimit,
  onSaveCashInSafe,
}: BalanceSummaryRowProps) {
  return (
    <div className={styles.row}>
      <EditableStatCard
        label="System Limit"
        value={systemLimitUSD}
        currency="USD"
        editable
        onSave={onSaveSystemLimit}
      />
      <EditableStatCard
        label="Cash in Safe"
        value={cashInSafeGBP}
        currency="GBP"
        editable
        onSave={onSaveCashInSafe}
      />
      <EditableStatCard
        label="Total Agent Debt"
        value={totalAgentDebtGBP}
        currency="GBP"
      />
    </div>
  );
}
