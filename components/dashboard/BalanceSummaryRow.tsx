"use client";

import type { ReactNode } from "react";
import { EditableStatCard } from "./EditableStatCard";
import styles from "./BalanceSummaryRow.module.css";

interface BalanceSummaryRowProps {
  systemLimitUSD: number;
  cashInSafeGBP: number;
  totalAgentDebtGBP: number;
  onSaveSystemLimit: (next: number) => Promise<void>;
  onSaveCashInSafe: (next: number) => Promise<void>;
  children?: ReactNode;
}

export function BalanceSummaryRow({
  systemLimitUSD,
  cashInSafeGBP,
  totalAgentDebtGBP,
  onSaveSystemLimit,
  onSaveCashInSafe,
  children,
}: BalanceSummaryRowProps) {
  return (
    <div className={styles.row} data-tour="balance-summary">
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
      {children}
    </div>
  );
}
