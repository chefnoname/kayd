"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import styles from "./EODSummaryPanel.module.css";

interface EODSummaryPanelProps {
  openingGBP: number;
  cashInSafeGBP: number;
  collectionsGBP: number;
  agentDebtGBP: number;
  expectedGBP: number;
  formula: string;
}

export function EODSummaryPanel({
  openingGBP,
  cashInSafeGBP,
  collectionsGBP,
  agentDebtGBP,
  expectedGBP,
  formula,
}: EODSummaryPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>End-of-day summary</CardTitle>
      </CardHeader>
      <CardContent className={styles.content}>
        <Row label="Opening balance" value={openingGBP} />
        <Row label="Cash in safe" value={cashInSafeGBP} />
        <Row label="Collections today" value={collectionsGBP} />
        <Row label="Total agent debt (GBP)" value={agentDebtGBP} negative />
        <div className={styles.divider} />
        <Row label="Expected closing" value={expectedGBP} strong />
        <p className={styles.formula}>{formula}</p>
      </CardContent>
    </Card>
  );
}

function Row({
  label,
  value,
  strong,
  negative,
}: {
  label: string;
  value: number;
  strong?: boolean;
  negative?: boolean;
}) {
  return (
    <div className={styles.row}>
      <span className={styles.label}>{label}</span>
      <span
        className={`${strong ? styles.valueStrong : styles.value} ${
          negative ? styles.negative : ""
        }`}
      >
        {negative ? "− " : ""}
        {formatCurrency(value, "GBP")}
      </span>
    </div>
  );
}
