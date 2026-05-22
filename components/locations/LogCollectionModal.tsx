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
import { formatCurrency, toDateString } from "@/lib/utils";
import type { RegionalOffice } from "./types";
import styles from "./LocationModal.module.css";

interface LogCollectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  office: RegionalOffice | null;
  onLogged: () => void;
}

export function LogCollectionModal({
  open,
  onOpenChange,
  office,
  onLogged,
}: LogCollectionModalProps) {
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(toDateString());
  const [driver, setDriver] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setAmount("");
      setDate(toDateString());
      setDriver("");
      setError(null);
      setSaving(false);
    }
  }, [open, office]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!office) return;
    setError(null);

    const amt = Number(amount);
    const driverName = driver.trim();

    if (!Number.isFinite(amt) || amt <= 0) {
      return setError("Amount must be greater than 0.");
    }
    if (amt > office.cash_held_gbp + 0.005) {
      return setError(
        `Amount exceeds cash held at this office (${formatCurrency(
          office.cash_held_gbp,
          "GBP"
        )}).`
      );
    }
    if (!date) return setError("Date is required.");
    if (!driverName) return setError("Driver name is required.");

    setSaving(true);
    const supabase = createClient();
    const orgId = await getOrganisationId();
    if (!orgId) {
      setSaving(false);
      return setError("Your account is not attached to an organisation.");
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error: insertError } = await supabase
      .from("collection_pickups")
      .insert({
        organisation_id: orgId,
        office_id: office.id,
        amount_gbp: amt,
        date,
        collected_by_name: driverName,
        created_by: user?.id ?? null,
      });

    if (insertError) {
      setSaving(false);
      setError(insertError.message);
      return;
    }

    const newCash =
      Math.round((office.cash_held_gbp - amt) * 100) / 100;

    const { error: updateError } = await supabase
      .from("regional_offices")
      .update({
        cash_held_gbp: newCash,
        last_collection_date: date,
      })
      .eq("organisation_id", orgId)
      .eq("id", office.id);

    setSaving(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    onOpenChange(false);
    onLogged();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log collection</DialogTitle>
          <DialogDescription>
            Record cash picked up from this office.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className={styles.form}>
          {office && (
            <div className={styles.summary}>
              <div className={styles.summaryName}>{office.name}</div>
              <div className={styles.summaryHeld}>
                Cash held: {formatCurrency(office.cash_held_gbp, "GBP")}
              </div>
            </div>
          )}

          <div className={styles.row}>
            <div className={styles.field}>
              <Label htmlFor="collection-amount">Amount collected (GBP)</Label>
              <Input
                id="collection-amount"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className={styles.field}>
              <Label htmlFor="collection-date">Date</Label>
              <Input
                id="collection-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div className={styles.field}>
            <Label htmlFor="collection-driver">Collected by</Label>
            <Input
              id="collection-driver"
              value={driver}
              onChange={(e) => setDriver(e.target.value)}
              required
              placeholder="Driver name"
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
              {saving ? "Logging…" : "Confirm collection"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
