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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { createClient } from "@/lib/supabase";
import { getOrganisationId } from "@/lib/org";
import type { Deposit } from "./types";
import styles from "./DepositModal.module.css";

interface EditDepositModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deposit: Deposit | null;
  onUpdated: () => void;
}

export function EditDepositModal({
  open,
  onOpenChange,
  deposit,
  onUpdated,
}: EditDepositModalProps) {
  const [holderName, setHolderName] = useState("");
  const [amount, setAmount] = useState("");
  const [dateReceived, setDateReceived] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (deposit) {
      setHolderName(deposit.holder_name);
      setAmount(String(deposit.amount_usd));
      setDateReceived(deposit.date_received);
      setLocation(deposit.location ?? "");
      setNotes(deposit.notes ?? "");
      setError(null);
    }
  }, [deposit]);

  const locked = deposit?.status === "released";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!deposit || locked) return;
    setError(null);

    const trimmedHolder = holderName.trim();
    const amt = Number(amount);

    if (!trimmedHolder) return setError("Holder name is required.");
    if (!Number.isFinite(amt) || amt <= 0) {
      return setError("Amount must be greater than 0.");
    }
    if (!dateReceived) return setError("Date received is required.");

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
        holder_name: trimmedHolder,
        amount_usd: amt,
        date_received: dateReceived,
        location: location.trim() || null,
        notes: notes.trim() || null,
      })
      .eq("organisation_id", orgId)
      .eq("id", deposit.id);
    setSaving(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    onOpenChange(false);
    onUpdated();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit deposit</DialogTitle>
          <DialogDescription>
            {locked
              ? "This deposit has been released and cannot be edited."
              : "Update the deposit's details."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className={styles.form}>
          <div className={styles.field}>
            <Label htmlFor="edit-deposit-holder">Holder name</Label>
            <Input
              id="edit-deposit-holder"
              value={holderName}
              onChange={(e) => setHolderName(e.target.value)}
              required
              disabled={locked}
            />
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <Label htmlFor="edit-deposit-amount">Amount (USD)</Label>
              <Input
                id="edit-deposit-amount"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                disabled={locked}
              />
            </div>
            <div className={styles.field}>
              <Label htmlFor="edit-deposit-date">Date received</Label>
              <Input
                id="edit-deposit-date"
                type="date"
                value={dateReceived}
                onChange={(e) => setDateReceived(e.target.value)}
                required
                disabled={locked}
              />
            </div>
          </div>

          <div className={styles.field}>
            <Label htmlFor="edit-deposit-location">Location</Label>
            <Input
              id="edit-deposit-location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              disabled={locked}
            />
          </div>

          <div className={styles.field}>
            <Label htmlFor="edit-deposit-notes">Notes</Label>
            <Textarea
              id="edit-deposit-notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={locked}
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
              {locked ? "Close" : "Cancel"}
            </Button>
            {!locked && (
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save changes"}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
