"use client";

import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  calculateDiscrepancy,
  formatCurrency,
  type DiscrepancyResult,
} from "@/lib/utils";
import styles from "./ReconciliationResult.module.css";

interface ReconciliationResultProps {
  expectedGBP: number;
  actualGBP: number | null;
  reason: string;
  onReasonChange: (v: string) => void;
  disabled?: boolean;
}

export function ReconciliationResult({
  expectedGBP,
  actualGBP,
  reason,
  onReasonChange,
  disabled,
}: ReconciliationResultProps) {
  if (actualGBP === null) {
    return (
      <div className={styles.placeholder}>
        Enter the physical cash count to see reconciliation.
      </div>
    );
  }

  const result: DiscrepancyResult = calculateDiscrepancy(
    expectedGBP,
    actualGBP
  );

  if (!result.hasDiscrepancy) {
    return (
      <div className={`${styles.banner} ${styles.success}`}>
        <CheckCircle2 size={18} />
        <div>
          <div className={styles.bannerTitle}>Day balanced</div>
          <div className={styles.bannerBody}>
            Closing balance: {formatCurrency(actualGBP, "GBP")}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <div className={`${styles.banner} ${styles.error}`}>
        <AlertTriangle size={18} />
        <div>
          <div className={styles.bannerTitle}>
            Discrepancy of {formatCurrency(result.amount, "GBP")} detected
          </div>
          <div className={styles.bannerBody}>
            Actual is <strong>{result.direction}</strong> expected by{" "}
            {formatCurrency(result.amount, "GBP")}
          </div>
        </div>
      </div>

      <div className={styles.field}>
        <Label htmlFor="discrepancy-reason">
          Discrepancy reason (required to close)
        </Label>
        <Textarea
          id="discrepancy-reason"
          rows={3}
          value={reason}
          onChange={(e) => onReasonChange(e.target.value)}
          disabled={disabled}
          placeholder="Explain the difference, what was investigated, who was informed…"
        />
      </div>
    </div>
  );
}
