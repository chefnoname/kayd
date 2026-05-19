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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { createClient } from "@/lib/supabase";
import { toDateString } from "@/lib/utils";
import styles from "./DepositModal.module.css";

interface AddDepositModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

export function AddDepositModal({
  open,
  onOpenChange,
  onCreated,
}: AddDepositModalProps) {
  const [holderName, setHolderName] = useState("");
  const [amount, setAmount] = useState("");
  const [dateReceived, setDateReceived] = useState(toDateString());
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function reset() {
    setHolderName("");
    setAmount("");
    setDateReceived(toDateString());
    setLocation("");
    setNotes("");
    setError(null);
    setSaving(false);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
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
    const { error: insertError } = await supabase
      .from("individual_deposits")
      .insert({
        holder_name: trimmedHolder,
        amount_usd: amt,
        date_received: dateReceived,
        location: location.trim() || null,
        notes: notes.trim() || null,
        status: "held",
      });
    setSaving(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    reset();
    onOpenChange(false);
    onCreated();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add deposit</DialogTitle>
          <DialogDescription>
            Record money held on behalf of an individual.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className={styles.form}>
          <div className={styles.field}>
            <Label htmlFor="deposit-holder">Holder name</Label>
            <Input
              id="deposit-holder"
              value={holderName}
              onChange={(e) => setHolderName(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <Label htmlFor="deposit-amount">Amount (USD)</Label>
              <Input
                id="deposit-amount"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
            <div className={styles.field}>
              <Label htmlFor="deposit-date">Date received</Label>
              <Input
                id="deposit-date"
                type="date"
                value={dateReceived}
                onChange={(e) => setDateReceived(e.target.value)}
                required
              />
            </div>
          </div>

          <div className={styles.field}>
            <Label htmlFor="deposit-location">Location</Label>
            <Input
              id="deposit-location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. London office"
            />
          </div>

          <div className={styles.field}>
            <Label htmlFor="deposit-notes">Notes</Label>
            <Textarea
              id="deposit-notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
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
              {saving ? "Saving…" : "Add deposit"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
