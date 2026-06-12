"use client";

import type { ReactNode } from "react";
import { EditableStatCard } from "./EditableStatCard";
import styles from "./BalanceSummaryRow.module.css";

interface BalanceSummaryRowProps {
  systemLimitUSD: number;
  cashInSafeGBP: number;
  onSaveSystemLimit: (next: number) => Promise<void>;
  onSaveCashInSafe: (next: number) => Promise<void>;
  children?: ReactNode;
}

export function BalanceSummaryRow({
  systemLimitUSD,
  cashInSafeGBP,
  onSaveSystemLimit,
  onSaveCashInSafe,
  children,
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
      {children}
    </div>
  );
}
