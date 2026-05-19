"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import styles from "./CloseDayButton.module.css";

interface CloseDayButtonProps {
  disabled?: boolean;
  submitting?: boolean;
  expectedGBP: number;
  actualGBP: number;
  discrepancyAmount: number;
  discrepancyDirection: "over" | "under" | "balanced";
  reason: string;
  onConfirm: () => Promise<void> | void;
}

export function CloseDayButton({
  disabled,
  submitting,
  expectedGBP,
  actualGBP,
  discrepancyAmount,
  discrepancyDirection,
  reason,
  onConfirm,
}: CloseDayButtonProps) {
  const [open, setOpen] = useState(false);

  async function handleConfirm() {
    await onConfirm();
    setOpen(false);
  }

  return (
    <div className={styles.wrap}>
      <Button
        size="lg"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className={styles.btn}
      >
        Close day
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm day close</DialogTitle>
            <DialogDescription>
              This locks today's figures. You won't be able to edit them again.
            </DialogDescription>
          </DialogHeader>

          <div className={styles.list}>
            <Row label="Expected closing" value={formatCurrency(expectedGBP, "GBP")} />
            <Row label="Counted closing" value={formatCurrency(actualGBP, "GBP")} strong />
            {discrepancyDirection !== "balanced" && (
              <Row
                label="Discrepancy"
                value={`${formatCurrency(discrepancyAmount, "GBP")} (${discrepancyDirection})`}
              />
            )}
            {discrepancyDirection !== "balanced" && reason && (
              <div className={styles.reason}>
                <div className={styles.reasonLabel}>Reason</div>
                <div className={styles.reasonText}>{reason}</div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={submitting}
            >
              Go back
            </Button>
            <Button onClick={handleConfirm} disabled={submitting}>
              {submitting ? "Closing…" : "Confirm & lock"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
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
