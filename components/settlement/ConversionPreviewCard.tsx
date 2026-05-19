"use client";

import { AlertTriangle, CheckCircle2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { calculateSettlement, formatCurrency } from "@/lib/utils";
import type { SettlementAgent } from "./types";
import styles from "./ConversionPreviewCard.module.css";

interface ConversionPreviewCardProps {
  agent: SettlementAgent | null;
  receivedGBP: number;
  rate: number | null;
}

export function ConversionPreviewCard({
  agent,
  receivedGBP,
  rate,
}: ConversionPreviewCardProps) {
  if (!rate) {
    return (
      <Card className={styles.card}>
        <CardHeader>
          <CardTitle>Live preview</CardTitle>
        </CardHeader>
        <CardContent>
          <p className={styles.muted}>
            Today's GBP→USD rate has not been set. Set it in Daily Setup before
            recording a settlement.
          </p>
        </CardContent>
      </Card>
    );
  }

  const balance = agent?.balance_usd ?? 0;
  const calc = calculateSettlement(balance, receivedGBP || 0, rate);

  const overpaymentBy =
    calc.isOverpayment ? Math.abs(calc.newBalance) : 0;

  return (
    <Card className={styles.card}>
      <CardHeader>
        <CardTitle>Live preview</CardTitle>
      </CardHeader>
      <CardContent className={styles.content}>
        <Row label="Today's rate" value={`£1 = $${rate.toFixed(4)}`} />
        <Row
          label="Cash received"
          value={formatCurrency(receivedGBP || 0, "GBP")}
        />
        <Row
          label="USD equivalent"
          value={formatCurrency(calc.usdEquivalent, "USD")}
          strong
        />
        <Divider />
        <Row label="Agent owes" value={formatCurrency(balance, "USD")} />
        <Row
          label="Remaining after"
          value={formatCurrency(
            calc.isOverpayment ? 0 : calc.newBalance,
            "USD"
          )}
          strong
        />

        {receivedGBP > 0 && calc.isFullSettlement && (
          <div className={`${styles.alert} ${styles.success}`}>
            <CheckCircle2 size={16} />
            <span>This settles the account in full</span>
          </div>
        )}
        {calc.isOverpayment && (
          <div className={`${styles.alert} ${styles.warning}`}>
            <AlertTriangle size={16} />
            <span>
              This payment exceeds the agent's balance by{" "}
              <strong>{formatCurrency(overpaymentBy, "USD")}</strong>
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Row({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className={styles.row}>
      <span className={styles.label}>{label}</span>
      <span className={strong ? styles.valueStrong : styles.value}>
        {value}
      </span>
    </div>
  );
}

function Divider() {
  return <div className={styles.divider} />;
}
