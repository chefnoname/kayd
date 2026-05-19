"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { calculateSettlement, formatCurrency } from "@/lib/utils";
import type { SettlementAgent } from "./types";
import styles from "./SettlementConfirmModal.module.css";

interface SettlementConfirmModalProps {
  open: boolean;
  agent: SettlementAgent | null;
  receivedGBP: number;
  rate: number;
  receiptNumber: string;
  notes: string;
  submitting?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function SettlementConfirmModal({
  open,
  agent,
  receivedGBP,
  rate,
  receiptNumber,
  notes,
  submitting,
  onConfirm,
  onCancel,
}: SettlementConfirmModalProps) {
  if (!agent) return null;

  const calc = calculateSettlement(agent.balance_usd, receivedGBP, rate);
  const overpaymentBy = calc.isOverpayment ? Math.abs(calc.newBalance) : 0;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm settlement</DialogTitle>
          <DialogDescription>
            Review before writing this to the ledger.
          </DialogDescription>
        </DialogHeader>

        <div className={styles.list}>
          <Row label="Agent" value={agent.name} />
          <Row label="Today's rate" value={`£1 = $${rate.toFixed(4)}`} />
          <Row label="Cash received" value={formatCurrency(receivedGBP, "GBP")} />
          <Row
            label="USD equivalent"
            value={formatCurrency(calc.usdEquivalent, "USD")}
            strong
          />
          <Divider />
          <Row label="Agent owes" value={formatCurrency(agent.balance_usd, "USD")} />
          <Row
            label="Remaining after"
            value={formatCurrency(
              calc.isOverpayment ? 0 : calc.newBalance,
              "USD"
            )}
            strong
          />
          <Row label="Receipt no." value={receiptNumber} />
          {notes && <Row label="Notes" value={notes} />}

          {calc.isFullSettlement && (
            <div className={`${styles.alert} ${styles.success}`}>
              <CheckCircle2 size={16} />
              <span>This settles the account in full</span>
            </div>
          )}
          {calc.isOverpayment && (
            <div className={`${styles.alert} ${styles.warning}`}>
              <AlertTriangle size={16} />
              <span>
                Overpayment by{" "}
                <strong>{formatCurrency(overpaymentBy, "USD")}</strong>
              </span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={submitting}>
            Go back
          </Button>
          <Button onClick={onConfirm} disabled={submitting}>
            {submitting ? "Saving…" : "Confirm"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
