"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatUSD } from "@/lib/utils";
import type { Deposit } from "./types";
import styles from "./DepositDetailModal.module.css";

interface DepositDetailModalProps {
  deposit: Deposit | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (d: Deposit) => void;
  onRelease: (d: Deposit) => void;
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function DepositDetailModal({
  deposit,
  open,
  onOpenChange,
  onEdit,
  onRelease,
}: DepositDetailModalProps) {
  if (!deposit) return null;

  const isHeld = deposit.status === "held";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={styles.content}>
        <DialogHeader>
          <DialogTitle className={styles.title}>
            {deposit.holder_name}
          </DialogTitle>
          <DialogDescription className={styles.subtitle}>
            Deposit received {formatDate(deposit.date_received)}
          </DialogDescription>
        </DialogHeader>

        <div className={styles.body}>
          {/* Amount + Status hero */}
          <div className={styles.hero}>
            <div className={styles.amount}>{formatUSD(deposit.amount_usd)}</div>
            {isHeld ? (
              <Badge className={styles.badgeHeld}>Held</Badge>
            ) : (
              <Badge className={styles.badgeReleased}>Released</Badge>
            )}
          </div>

          {/* Info grid */}
          <div className={styles.grid}>
            <div className={styles.field}>
              <span className={styles.label}>Location</span>
              <span className={styles.value}>{deposit.location || "—"}</span>
            </div>
            <div className={styles.field}>
              <span className={styles.label}>Recorded by</span>
              <span className={styles.value}>{deposit.recorded_by || "—"}</span>
            </div>
            <div className={styles.field}>
              <span className={styles.label}>Date received</span>
              <span className={styles.value}>
                {formatDate(deposit.date_received)}
              </span>
            </div>
            <div className={styles.field}>
              <span className={styles.label}>Created</span>
              <span className={styles.value}>
                {formatDateTime(deposit.created_at)}
              </span>
            </div>
            {deposit.released_to && (
              <div className={styles.field}>
                <span className={styles.label}>Released to</span>
                <span className={styles.value}>{deposit.released_to}</span>
              </div>
            )}
            {deposit.released_at && (
              <div className={styles.field}>
                <span className={styles.label}>Released at</span>
                <span className={styles.value}>
                  {formatDateTime(deposit.released_at)}
                </span>
              </div>
            )}
          </div>

          {/* Notes */}
          {deposit.notes && (
            <div className={styles.notesBlock}>
              <span className={styles.label}>Notes</span>
              <p className={styles.notesText}>{deposit.notes}</p>
            </div>
          )}

          {/* Actions */}
          {isHeld && (
            <div className={styles.actions}>
              <Button
                onClick={() => {
                  onOpenChange(false);
                  onRelease(deposit);
                }}
                className={styles.releaseBtn}
              >
                Release deposit
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  onOpenChange(false);
                  onEdit(deposit);
                }}
              >
                Edit
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
