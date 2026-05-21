"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { createClient } from "@/lib/supabase";
import { getOrganisationId } from "@/lib/org";
import { formatUSD } from "@/lib/utils";
import type { Deposit } from "./types";
import styles from "./DepositModal.module.css";

interface ReleaseDepositModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deposit: Deposit | null;
  onReleased: () => void;
}

export function ReleaseDepositModal({
  open,
  onOpenChange,
  deposit,
  onReleased,
}: ReleaseDepositModalProps) {
  const [releasedTo, setReleasedTo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setReleasedTo("");
      setError(null);
      setSaving(false);
    }
  }, [open, deposit]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!deposit) return;
    setError(null);

    const trimmed = releasedTo.trim();
    if (!trimmed) return setError("“Released to” is required.");

    setSaving(true);
    const supabase = createClient();
    const orgId = await getOrganisationId();
    if (!orgId) {
      setSaving(false);
      return setError("Your account is not attached to an organisation.");
    }
    const { error: updateError } = await supabase
      .from("individual_deposits")
      .update({
        status: "released",
        released_at: new Date().toISOString(),
        released_to: trimmed,
      })
      .eq("organisation_id", orgId)
      .eq("id", deposit.id);
    setSaving(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    onOpenChange(false);
    onReleased();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Release deposit</DialogTitle>
          <DialogDescription>
            Mark this deposit as handed back. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className={styles.form}>
          {deposit && (
            <div className={styles.summary}>
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>Holder</span>
                <span className={styles.summaryValue}>
                  {deposit.holder_name}
                </span>
              </div>
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>Amount</span>
                <span className={styles.summaryValue}>
                  {formatUSD(deposit.amount_usd)}
                </span>
              </div>
            </div>
          )}

          <div className={styles.field}>
            <Label htmlFor="released-to">Released to</Label>
            <Input
              id="released-to"
              value={releasedTo}
              onChange={(e) => setReleasedTo(e.target.value)}
              required
              autoFocus
              placeholder="Name of person who collected"
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Releasing…" : "Confirm release"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
