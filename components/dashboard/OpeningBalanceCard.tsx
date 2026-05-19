"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCurrency, formatLongDate } from "@/lib/utils";
import styles from "./OpeningBalanceCard.module.css";

interface OpeningBalanceCardProps {
  openingGBP: number;
  yesterday: Date;
}

export function OpeningBalanceCard({
  openingGBP,
  yesterday,
}: OpeningBalanceCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className={styles.label}>
          Opening Balance — carried from {formatLongDate(yesterday)}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className={styles.value}>{formatCurrency(openingGBP, "GBP")}</div>
      </CardContent>
    </Card>
  );
}
