"use client";

import { CheckCircle2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import styles from "./AlreadyClosedState.module.css";

interface AlreadyClosedStateProps {
  closedAt: string | null;
  closingGBP: number;
  discrepancy: number;
  notes: string | null;
}

function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function AlreadyClosedState({
  closedAt,
  closingGBP,
  discrepancy,
  notes,
}: AlreadyClosedStateProps) {
  return (
    <Card className={styles.card}>
      <CardHeader>
        <CardTitle className={styles.title}>
          <CheckCircle2 size={20} />
          <span>Day closed</span>
        </CardTitle>
      </CardHeader>
      <CardContent className={styles.content}>
        <p className={styles.line}>
          Today's day was closed
          {closedAt ? ` at ${formatDateTime(closedAt)}` : ""}.
        </p>
        <div className={styles.figureRow}>
          <span className={styles.label}>Closing balance</span>
          <span className={styles.value}>
            {formatCurrency(closingGBP, "GBP")}
          </span>
        </div>
        {Math.abs(discrepancy) >= 0.005 && (
          <div className={styles.figureRow}>
            <span className={styles.label}>Recorded discrepancy</span>
            <span className={styles.value}>
              {formatCurrency(Math.abs(discrepancy), "GBP")}{" "}
              {discrepancy > 0 ? "(over)" : "(under)"}
            </span>
          </div>
        )}
        {notes && (
          <div className={styles.notes}>
            <div className={styles.notesLabel}>Notes</div>
            <div className={styles.notesText}>{notes}</div>
          </div>
        )}
        <p className={styles.muted}>
          Tomorrow's opening balance will be {formatCurrency(closingGBP, "GBP")}.
        </p>
      </CardContent>
    </Card>
  );
}
