"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatUSD } from "@/lib/utils";
import styles from "./DepositSummaryCards.module.css";

interface DepositSummaryCardsProps {
  totalHeldUSD: number;
  activeCount: number;
}

export function DepositSummaryCards({
  totalHeldUSD,
  activeCount,
}: DepositSummaryCardsProps) {
  return (
    <div className={styles.grid}>
      <Card>
        <CardHeader>
          <CardTitle className={styles.label}>Total held</CardTitle>
        </CardHeader>
        <CardContent>
          <div className={styles.value}>{formatUSD(totalHeldUSD)}</div>
          <p className={styles.hint}>Sum of all currently-held deposits.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className={styles.label}>Active deposits</CardTitle>
        </CardHeader>
        <CardContent>
          <div className={styles.value}>{activeCount}</div>
          <p className={styles.hint}>Count of deposits with status “held”.</p>
        </CardContent>
      </Card>
    </div>
  );
}
