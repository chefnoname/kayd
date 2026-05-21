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
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { createClient } from "@/lib/supabase";
import { getOrganisationId } from "@/lib/org";
import styles from "./LocationModal.module.css";

interface AddLocationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

export function AddLocationModal({
  open,
  onOpenChange,
  onCreated,
}: AddLocationModalProps) {
  const [name, setName] = useState("");
  const [cash, setCash] = useState("0");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function reset() {
    setName("");
    setCash("0");
    setError(null);
    setSaving(false);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmed = name.trim();
    const amt = Number(cash);

    if (!trimmed) return setError("Office name is required.");
    if (!Number.isFinite(amt) || amt < 0) {
      return setError("Initial cash held must be 0 or greater.");
    }

    setSaving(true);
    const supabase = createClient();
    const orgId = await getOrganisationId();
    if (!orgId) {
      setSaving(false);
      return setError("Your account is not attached to an organisation.");
    }
    const { error: insertError } = await supabase
      .from("regional_offices")
      .insert({
        organisation_id: orgId,
        name: trimmed,
        cash_held_gbp: amt,
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
          <DialogTitle>Add office</DialogTitle>
          <DialogDescription>
            Create a new regional office that holds cash between collections.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className={styles.form}>
          <div className={styles.field}>
            <Label htmlFor="office-name">Office name</Label>
            <Input
              id="office-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
              placeholder="e.g. Birmingham"
            />
          </div>

          <div className={styles.field}>
            <Label htmlFor="office-cash">Initial cash held (GBP)</Label>
            <Input
              id="office-cash"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={cash}
              onChange={(e) => setCash(e.target.value)}
              required
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
              {saving ? "Saving…" : "Add office"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
