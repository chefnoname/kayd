"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import styles from "./CollectionFollowUpDialog.module.css";

export interface PendingCollection {
  id: string;
  company_name: string;
  amount_gbp: number;
  created_at: string;
}

interface CollectionFollowUpDialogProps {
  collections: PendingCollection[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (id: string, received: boolean) => Promise<void>;
}

export function CollectionFollowUpDialog({
  collections,
  open,
  onOpenChange,
  onConfirm,
}: CollectionFollowUpDialogProps) {
  const [current, setCurrent] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setCurrent(0);
  }, [open]);

  const collection = collections[current];
  const total = collections.length;

  if (!collection) return null;

  async function handleAction(received: boolean) {
    setSaving(true);
    try {
      await onConfirm(collection.id, received);
      if (current < total - 1) {
        setCurrent((c) => c + 1);
      } else {
        onOpenChange(false);
      }
    } finally {
      setSaving(false);
    }
  }

  const submittedAt = new Date(collection.created_at).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Collection Follow-Up</DialogTitle>
          {total > 1 && (
            <DialogDescription>
              {current + 1} of {total} — please confirm each collection.
            </DialogDescription>
          )}
        </DialogHeader>
        <div className={styles.card}>
          <span className={styles.company}>{collection.company_name}</span>
          <span className={styles.amount}>
            {formatCurrency(collection.amount_gbp, "GBP")}
          </span>
          <span className={styles.date}>Submitted {submittedAt}</span>
        </div>
        <div className={styles.actions}>
          <Button
            variant="outline"
            disabled={saving}
            onClick={() => handleAction(false)}
          >
            Cash not received
          </Button>
          <Button
            variant="default"
            disabled={saving}
            onClick={() => handleAction(true)}
          >
            Cash received
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
